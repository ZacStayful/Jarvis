// app/api/whatsapp/send-followup/route.ts
// Day+1 / Day+3 / Day+7 follow-up messages. Called by n8n retry workflow
// (built in Session 4). Skips if the conversation is already active or
// already marked completed.

import { NextRequest, NextResponse } from 'next/server'
import { mondayQuery, escapeJSONForGraphQL } from '@/lib/monday-client'
import {
  MANAGEMENT_LEADS_BOARD,
  MANAGEMENT_LEADS_COLUMNS as COL,
} from '@/lib/monday-columns'
import { getFollowUpTemplate, type LeadProfile } from '@/lib/whatsapp-templates'
import {
  parseConversation,
  appendMessage,
  serializeConversation,
} from '@/lib/whatsapp-conversation'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim().replace(/^whatsapp:/i, '').trim()
  const compact = trimmed.replace(/[\s\-()]/g, '')
  if (!/^\+?\d{7,15}$/.test(compact)) return null
  return compact.startsWith('+') ? compact : `+${compact}`
}

interface LeadRow {
  id: string
  name: string
  address: string
  phone: string | null
  estimatedRent: number | null
  profileType: string
  waStatus: string
  waCompleted: boolean
  waMessagesSent: number
  conversationRaw: string
}

async function fetchLead(leadId: string): Promise<LeadRow | null> {
  const colIds = [
    COL.phoneE164,
    COL.address,
    COL.estAirbnbRent,
    COL.leadProfile,
    COL.waStatus,
    COL.waCompleted,
    COL.waMessagesSent,
    COL.waConversation,
  ]
  const colList = colIds.map((c) => `"${c}"`).join(', ')
  const query = `query {
    items(ids: [${leadId}]) {
      id
      name
      column_values(ids: [${colList}]) { id text value }
    }
  }`

  const data = await mondayQuery(query)
  const item = data?.items?.[0]
  if (!item) return null

  const cols = new Map<string, { text: string | null; value: string | null }>()
  for (const c of item.column_values || []) {
    cols.set(c.id, { text: c.text, value: c.value })
  }

  const phoneCol = cols.get(COL.phoneE164)
  let phone: string | null = null
  if (phoneCol?.value) {
    try {
      const parsed = JSON.parse(phoneCol.value)
      phone = parsed?.phone || parsed?.text || null
    } catch {
      phone = phoneCol.text
    }
  } else if (phoneCol?.text) {
    phone = phoneCol.text
  }

  const estRentRaw = cols.get(COL.estAirbnbRent)?.text
  const estimatedRent = estRentRaw ? Number(estRentRaw) : null
  const waSentRaw = cols.get(COL.waMessagesSent)?.text
  const waMessagesSent = waSentRaw ? Number(waSentRaw) : 0

  let waCompleted = false
  const completedCol = cols.get(COL.waCompleted)
  if (completedCol?.value) {
    try {
      const parsed = JSON.parse(completedCol.value)
      waCompleted = !!parsed?.checked
    } catch {
      waCompleted = false
    }
  }

  return {
    id: String(item.id),
    name: item.name || '',
    address: cols.get(COL.address)?.text || '',
    phone,
    estimatedRent: Number.isFinite(estimatedRent as number) ? (estimatedRent as number) : null,
    profileType: cols.get(COL.leadProfile)?.text || '',
    waStatus: cols.get(COL.waStatus)?.text || '',
    waCompleted,
    waMessagesSent: Number.isFinite(waMessagesSent) ? waMessagesSent : 0,
    conversationRaw: cols.get(COL.waConversation)?.text || '',
  }
}

async function sendTwilio(toPhone: string, body: string): Promise<{ messageSid: string } | { error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER
  if (!sid || !token || !from) return { error: 'twilio_env_missing' }

  // SMS — plain E.164 on both From and To, no channel prefix.
  const to = toPhone.replace(/^whatsapp:/i, '')
  const fromNormalised = from.replace(/^whatsapp:/i, '')
  const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
  const params = new URLSearchParams({ From: fromNormalised, To: to, Body: body })

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) return { error: json?.message || `twilio_${res.status}` }
    if (!json?.sid) return { error: 'twilio_no_sid' }
    return { messageSid: json.sid }
  } catch (err) {
    return { error: (err as Error).message || 'twilio_exception' }
  }
}

async function logActivity(payload: {
  leadId: string
  leadName: string
  eventType: string
  source: string
  notes: string
}): Promise<void> {
  const url = process.env.N8N_LOG_ACTIVITY_WEBHOOK
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[whatsapp/send-followup] activity log failed', err)
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 })
  }
  const leadId = body?.leadId ? String(body.leadId) : ''
  const step = body?.step
  if (!leadId) {
    return NextResponse.json({ success: false, error: 'missing_leadId' }, { status: 400 })
  }
  if (step !== 1 && step !== 2 && step !== 3) {
    return NextResponse.json({ success: false, error: 'invalid_step' }, { status: 400 })
  }

  try {
    const lead = await fetchLead(leadId)
    if (!lead) {
      return NextResponse.json({ success: false, error: 'lead_not_found' }, { status: 404 })
    }

    // Guard: conversation is active or in a terminal state — skip.
    const blockingStatuses = new Set(['Replied', 'Booked', 'Abandoned'])
    if (blockingStatuses.has(lead.waStatus)) {
      return NextResponse.json(
        { skipped: true, reason: 'conversation_active' },
        { status: 200 },
      )
    }
    if (lead.waCompleted) {
      return NextResponse.json({ skipped: true, reason: 'completed' }, { status: 200 })
    }

    const phone = normalisePhone(lead.phone)
    if (!phone) {
      return NextResponse.json({ error: 'no_phone' }, { status: 400 })
    }

    const profile: LeadProfile = {
      name: lead.name,
      address: lead.address,
      estimatedRent: lead.estimatedRent,
      // Follow-ups don't re-parse the PDF. If figures matter, the
      // initial send already used them.
      strNetMonthly: null,
      longLetNetMonthly: null,
      monthlySurplus: null,
      profileType: lead.profileType,
      bestOpeningMessage: null,
    }
    const message = getFollowUpTemplate(step as 1 | 2 | 3, profile)

    const sendResult = await sendTwilio(phone, message)
    if ('error' in sendResult) {
      return NextResponse.json(
        { success: false, error: `twilio_failed: ${sendResult.error}` },
        { status: 502 },
      )
    }

    // Append to conversation, bump messages-sent count.
    const conversation = parseConversation(lead.conversationRaw)
    if (!conversation.leadId) conversation.leadId = leadId
    const updatedConversation = appendMessage(
      { ...conversation, currentStep: step as number },
      'outbound',
      message,
    )

    const updates: Record<string, any> = {
      [COL.waMessagesSent]: (lead.waMessagesSent || 0) + 1,
      [COL.waConversation]: serializeConversation(updatedConversation),
    }
    if (step === 3) {
      updates[COL.waCompleted] = { checked: 'true' }
      updates[COL.waStatus] = { label: 'No Response' }
    }

    const columnValuesJSON = JSON.stringify(updates)
    const mutation = `mutation {
      change_multiple_column_values(
        board_id: ${MANAGEMENT_LEADS_BOARD},
        item_id: ${leadId},
        column_values: "${escapeJSONForGraphQL(columnValuesJSON)}"
      ) { id }
    }`
    try {
      await mondayQuery(mutation)
    } catch (err) {
      console.error('[whatsapp/send-followup] monday update failed', err)
      return NextResponse.json(
        {
          success: true,
          step,
          messageSid: sendResult.messageSid,
          warning: 'monday_update_failed',
        },
        { status: 200 },
      )
    }

    await logActivity({
      leadId,
      leadName: lead.name,
      eventType: 'WhatsApp Sent',
      source: 'Vercel',
      notes: `follow-up step ${step}`,
    })

    return NextResponse.json({ success: true, step, messageSid: sendResult.messageSid })
  } catch (err) {
    console.error('[whatsapp/send-followup] unhandled', err)
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'unknown_error' },
      { status: 500 },
    )
  }
}
