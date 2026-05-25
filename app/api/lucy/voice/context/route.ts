// app/api/lucy/voice/context/route.ts
// Retell inbound-call webhook. Configured as the agent's
// `inbound_dynamic_variables_webhook_url`. When a lead phones in, Retell
// fires this URL with the caller's number; we look the number up in
// MANAGEMENT_LEADS_BOARD and return the lead's name, address, profile,
// cumulative call summary, last-call date and a condensed conversation
// history as Retell dynamic variables so Lucy opens with full context.
//
// Request body shape (Retell):
//   { event: "call_inbound",
//     call_inbound: { from_number, to_number, agent_id } }
//
// Response shape Retell expects:
//   { call_inbound: { dynamic_variables: { ... } } }
//
// All dynamic_variables values are strings (Retell requirement). Unknown
// leads still get a valid response with empty fields plus a
// `caller_is_known: "false"` flag so the agent prompt can branch.

import { NextRequest, NextResponse } from 'next/server'
import {
  findLeadByPhone,
  fetchLeadUpdates,
  normalisePhoneToE164,
} from '@/lib/monday-leads'
import { MANAGEMENT_LEADS_COLUMNS as COL } from '@/lib/monday-columns'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

// Extra Monday columns Lucy needs at the start of every call. Mirrors the
// dynamic variables the outbound /api/retell/call route sends so the agent
// prompt works identically for inbound and outbound calls.
const CALL_SUMMARY_COL = 'long_text_mm239abs'
const LAST_PHONED_ANSWERED_COL = 'date_mm1vpqam'

const CONTEXT_COLUMNS = [
  COL.address,
  COL.leadProfile,
  COL.email,
  CALL_SUMMARY_COL,
  LAST_PHONED_ANSWERED_COL,
] as const

// Retell requires every dynamic variable value to be a string.
function emptyVariables(): Record<string, string> {
  return {
    monday_item_id: '',
    lead_name: '',
    address: '',
    lead_profile: '',
    email: '',
    call_summary: '',
    last_call_date: '',
    web_meeting_summary: '',
    communication_context: '',
    caller_is_known: 'false',
  }
}

function formatDateForSpeech(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const day = date.getDate()
  const month = date.toLocaleDateString('en-GB', { month: 'long' })
  const suffix =
    day === 1 || day === 21 || day === 31 ? 'st' :
    day === 2 || day === 22 ? 'nd' :
    day === 3 || day === 23 ? 'rd' : 'th'
  return `${day}${suffix} ${month}`
}

function findWebMeetingSummary(updates: Array<{ body: string }>): string {
  const match = updates.find((u) =>
    u.body && u.body.trim().toLowerCase().startsWith('web meeting summary'),
  )
  return match ? match.body.trim() : ''
}

// Build a single-string log of the last few touchpoints so the agent
// prompt can quote it back ("we last spoke on…", "I emailed you about…").
function buildCommunicationContext(
  updates: Array<{ body: string; createdAt: string }>,
): string {
  if (!updates.length) return 'No previous contact recorded.'
  const lines = updates.slice(0, 5).map((u, i) => {
    const when = u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('en-GB', {
          timeZone: 'Europe/London',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'unknown date'
    const summary = u.body.split('---')[0].trim().slice(0, 240)
    return `${i + 1}. ${when}: ${summary}`
  })
  return lines.join('\n')
}

// Retell's inbound webhook contract: always 200 with the envelope it
// expects, even on internal failure — a non-2xx makes the agent fall back
// to the default opener with no variables, which is worse than empty
// variables for a known caller.
function inboundResponse(
  variables: Record<string, string>,
  meta?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      call_inbound: {
        dynamic_variables: variables,
        ...(meta ? { metadata: meta } : {}),
      },
    },
    { status: 200 },
  )
}

export async function POST(req: NextRequest) {
  let payload: any = null
  try {
    payload = await req.json()
  } catch {
    return inboundResponse(emptyVariables(), { error: 'invalid_json' })
  }

  const event = payload?.event
  // Retell only fires "call_inbound" against this URL, but tolerate the
  // alternative shape some integrations send during testing.
  const inbound = payload?.call_inbound ?? payload?.call ?? payload ?? {}
  const fromNumber: string = String(inbound?.from_number ?? '')

  if (!fromNumber) {
    console.warn('[lucy/voice/context] no from_number in payload', { event })
    return inboundResponse(emptyVariables(), { reason: 'no_from_number' })
  }

  const phoneE164 = normalisePhoneToE164(fromNumber)
  if (!phoneE164) {
    console.warn('[lucy/voice/context] phone normalisation failed', { fromNumber })
    return inboundResponse(emptyVariables(), {
      reason: 'phone_normalisation_failed',
      from_number: fromNumber,
    })
  }

  try {
    const lead = await findLeadByPhone(phoneE164, [...CONTEXT_COLUMNS])
    if (!lead) {
      console.log('[lucy/voice/context] no lead match for', phoneE164)
      return inboundResponse(emptyVariables(), {
        reason: 'no_lead_match',
        phone: phoneE164,
      })
    }

    const updates = await fetchLeadUpdates(lead.id, 10)
    const webMeetingSummary = findWebMeetingSummary(updates)
    const communicationContext = buildCommunicationContext(updates)

    const variables: Record<string, string> = {
      monday_item_id: lead.id,
      lead_name: lead.name,
      address: lead.columns[COL.address] || '',
      lead_profile: lead.columns[COL.leadProfile] || '',
      email: lead.columns[COL.email] || '',
      call_summary: lead.columns[CALL_SUMMARY_COL] || '',
      last_call_date: formatDateForSpeech(lead.columns[LAST_PHONED_ANSWERED_COL]),
      web_meeting_summary: webMeetingSummary,
      communication_context: communicationContext,
      caller_is_known: 'true',
    }

    console.log(
      `[lucy/voice/context] matched ${phoneE164} → ${lead.name} (item ${lead.id})`,
    )
    return inboundResponse(variables, {
      reason: 'lead_matched',
      monday_item_id: lead.id,
      phone: phoneE164,
    })
  } catch (err) {
    console.error('[lucy/voice/context] handler error', err)
    return inboundResponse(emptyVariables(), {
      reason: 'handler_error',
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

// Lightweight probe so curl / Retell's "test URL" button gets a sane
// response when hitting GET.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'lucy-voice-context' })
}
