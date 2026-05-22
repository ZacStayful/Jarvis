// app/api/whatsapp/send-initial/route.ts
// Sends the first outreach WhatsApp message to a cold lead. Called by n8n
// when a new lead enters the pipeline. Idempotent — guards on WA Messages
// Sent > 0 so a re-trigger never produces a duplicate first send.

import { NextRequest, NextResponse } from 'next/server'
import { mondayQuery, escapeJSONForGraphQL } from '@/lib/monday-client'
import {
  MANAGEMENT_LEADS_BOARD,
  MANAGEMENT_LEADS_COLUMNS as COL,
} from '@/lib/monday-columns'
import { getInitialTemplate, type LeadProfile } from '@/lib/whatsapp-templates'
import { getLearningsForProfile } from '@/lib/whatsapp-learnings'
import {
  emptyState,
  appendMessage,
  serializeConversation,
} from '@/lib/whatsapp-conversation'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  // Strip a leading whatsapp: in case it's already prefixed.
  const withoutPrefix = trimmed.replace(/^whatsapp:/i, '').trim()
  // Accept either +44... or 44... — normalise to E.164.
  const compact = withoutPrefix.replace(/[\s\-()]/g, '')
  if (!/^\+?\d{7,15}$/.test(compact)) return null
  return compact.startsWith('+') ? compact : `+${compact}`
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

interface LeadRow {
  id: string
  name: string
  address: string
  phone: string | null
  estimatedRent: number | null
  profileType: string
  waMessagesSent: number
  pdfUrl: string | null
}

async function fetchLead(leadId: string): Promise<LeadRow | null> {
  const colIds = [
    COL.phoneE164,
    COL.address,
    COL.estAirbnbRent,
    COL.leadProfile,
    COL.waMessagesSent,
    'files__1',
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

  // Extract first PDF asset URL from files__1.
  let pdfUrl: string | null = null
  const filesCol = cols.get('files__1')
  if (filesCol?.value) {
    try {
      const parsed = JSON.parse(filesCol.value)
      const assetId = parsed?.files?.[0]?.assetId
      if (assetId) {
        // Resolve the asset URL via a follow-up query.
        const assetQuery = `query { assets(ids: [${assetId}]) { id public_url url } }`
        const assetData = await mondayQuery(assetQuery)
        pdfUrl = assetData?.assets?.[0]?.public_url || assetData?.assets?.[0]?.url || null
      }
    } catch {
      pdfUrl = null
    }
  }

  return {
    id: String(item.id),
    name: item.name || '',
    address: cols.get(COL.address)?.text || '',
    phone,
    estimatedRent: Number.isFinite(estimatedRent as number) ? (estimatedRent as number) : null,
    profileType: cols.get(COL.leadProfile)?.text || '',
    waMessagesSent: Number.isFinite(waMessagesSent) ? waMessagesSent : 0,
    pdfUrl,
  }
}

// Best-effort PDF text extraction from raw bytes. Works for uncompressed
// PDFs (typical for analyser exports). On any failure returns null.
async function extractPdfNumbers(pdfUrl: string): Promise<{
  strNetMonthly: number | null
  longLetNetMonthly: number | null
  monthlySurplus: number | null
}> {
  const fallback = {
    strNetMonthly: null,
    longLetNetMonthly: null,
    monthlySurplus: null,
  } as const
  try {
    const res = await fetch(pdfUrl)
    if (!res.ok) return { ...fallback }
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    // Decode as latin1 — preserves byte-level text strings in the PDF body.
    let text = ''
    for (let i = 0; i < bytes.length; i++) {
      text += String.fromCharCode(bytes[i])
    }
    // Heuristic: scan for currency-tagged figures next to known labels.
    const findNumber = (labelRegex: RegExp): number | null => {
      const m = text.match(labelRegex)
      if (!m) return null
      const raw = m[1].replace(/[£,\s]/g, '')
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    const strNetMonthly =
      findNumber(/STR\s*Net[^\d£]{0,20}£?\s*([\d,]+(?:\.\d+)?)/i) ??
      findNumber(/Short\s*Term\s*Net[^\d£]{0,20}£?\s*([\d,]+(?:\.\d+)?)/i) ??
      findNumber(/Net\s*Monthly\s*\(STR\)[^\d£]{0,10}£?\s*([\d,]+(?:\.\d+)?)/i)
    const longLetNetMonthly =
      findNumber(/Long\s*Let\s*Net[^\d£]{0,20}£?\s*([\d,]+(?:\.\d+)?)/i) ??
      findNumber(/Long-?Let\s*Net\s*Monthly[^\d£]{0,10}£?\s*([\d,]+(?:\.\d+)?)/i)
    const monthlySurplus =
      findNumber(/Monthly\s*Surplus[^\d£]{0,20}£?\s*([\d,]+(?:\.\d+)?)/i) ??
      findNumber(/(?:Difference|Gap|Uplift)[^\d£]{0,20}£?\s*([\d,]+(?:\.\d+)?)/i) ??
      (strNetMonthly && longLetNetMonthly ? strNetMonthly - longLetNetMonthly : null)
    return { strNetMonthly, longLetNetMonthly, monthlySurplus }
  } catch {
    return { ...fallback }
  }
}

async function sendTwilio(toPhone: string, body: string): Promise<{ messageSid: string } | { error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER
  if (!sid || !token || !from) return { error: 'twilio_env_missing' }

  const to = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`
  const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
  const params = new URLSearchParams({ From: from, To: to, Body: body })

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
    console.error('[whatsapp/send-initial] activity log failed', err)
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
  if (!leadId) {
    return NextResponse.json({ success: false, error: 'missing_leadId' }, { status: 400 })
  }

  try {
    // 1. Fetch lead.
    const lead = await fetchLead(leadId)
    if (!lead) {
      return NextResponse.json({ success: false, error: 'lead_not_found' }, { status: 404 })
    }

    // 2. Guard: already contacted.
    if ((lead.waMessagesSent || 0) > 0) {
      return NextResponse.json({ skipped: true, reason: 'already_contacted' }, { status: 200 })
    }

    // 3. Phone.
    const phone = normalisePhone(lead.phone)
    if (!phone) {
      return NextResponse.json({ error: 'no_phone' }, { status: 400 })
    }

    // 4. PDF extraction (best-effort).
    let strNetMonthly: number | null = null
    let longLetNetMonthly: number | null = null
    let monthlySurplus: number | null = null
    if (lead.pdfUrl) {
      const parsed = await extractPdfNumbers(lead.pdfUrl)
      strNetMonthly = parsed.strNetMonthly
      longLetNetMonthly = parsed.longLetNetMonthly
      monthlySurplus = parsed.monthlySurplus
    }

    // 5. Learnings (Session 5 will replace this).
    const learnings = await getLearningsForProfile(lead.profileType)
    const bestOpeningMessage = learnings?.best_opening_message ?? null

    // 6. Compose.
    const profile: LeadProfile = {
      name: lead.name,
      address: lead.address,
      estimatedRent: lead.estimatedRent,
      strNetMonthly,
      longLetNetMonthly,
      monthlySurplus,
      profileType: lead.profileType,
      bestOpeningMessage,
    }
    const message = getInitialTemplate(profile)
    const templatePath = strNetMonthly !== null ? 'PATH_A' : 'PATH_B'

    // 7. Send.
    const sendResult = await sendTwilio(phone, message)
    if ('error' in sendResult) {
      return NextResponse.json(
        { success: false, error: `twilio_failed: ${sendResult.error}` },
        { status: 502 },
      )
    }

    // 8. Update Monday in a single mutation.
    const initialState = appendMessage(
      { ...emptyState(leadId), currentStep: 0 },
      'outbound',
      message,
    )
    const conversationJSON = serializeConversation(initialState)
    const columnValues = {
      [COL.waStatus]: { label: 'Sent' },
      [COL.waFirstSent]: { date: todayISODate() },
      [COL.waTemplateUsed]: templatePath,
      [COL.waMessagesSent]: 1,
      [COL.waConversation]: conversationJSON,
    }
    const columnValuesJSON = JSON.stringify(columnValues)
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
      console.error('[whatsapp/send-initial] monday update failed', err)
      // Twilio already sent — surface the partial failure but don't undo.
      return NextResponse.json(
        {
          success: true,
          messageSid: sendResult.messageSid,
          warning: 'monday_update_failed',
        },
        { status: 200 },
      )
    }

    // 9. Activity log.
    await logActivity({
      leadId,
      leadName: lead.name,
      eventType: 'WhatsApp Sent',
      source: 'Vercel',
      notes: templatePath,
    })

    // 10. Done.
    return NextResponse.json({ success: true, messageSid: sendResult.messageSid })
  } catch (err) {
    console.error('[whatsapp/send-initial] unhandled', err)
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'unknown_error' },
      { status: 500 },
    )
  }
}
