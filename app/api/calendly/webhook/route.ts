// app/api/calendly/webhook/route.ts
// Calendly webhook receiver — invitee.created → flip lead to Booked.
//
// Flow:
//   1. Verify Calendly-Webhook-Signature against CALENDLY_WEBHOOK_SIGNING_KEY
//      (HMAC-SHA256 over "<timestamp>.<rawBody>"). Skipped if the env var
//      isn't set (current subscription was created without a signing key —
//      see commit history) but the verification path is wired and ready.
//   2. Extract phone from payload.invitee.questions_and_answers (case-
//      insensitive "phone" match on the question). Accept the alternative
//      Calendly v2 shape where invitee fields sit directly on payload.
//   3. Normalise to E.164 (UK default for leading 0). Search Monday
//      board MANAGEMENT_LEADS_BOARD by phone column, paginating through
//      every page so a match isn't missed if Monday returns the lead on
//      a non-first page.
//   4. If WA Status is already "Booked" — return without re-writing
//      (idempotency: Calendly retries on non-2xx; idempotency-on-state
//      avoids double-logging the activity).
//   5. Set waStatus → "Booked", waCompleted → true on Monday.
//   6. POST activity-log to n8n.
//
// Hard guarantee: this handler ALWAYS returns 200. Calendly auto-disables
// subscriptions after sustained non-2xx responses, and a disabled
// subscription silently breaks the whole pipeline. Errors are caught and
// surfaced as { skipped: true, reason: "..." } payloads in the 200 body.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { mondayQuery, escapeJSONForGraphQL } from '@/lib/monday-client'
import {
  MANAGEMENT_LEADS_BOARD,
  MANAGEMENT_LEADS_COLUMNS as COL,
} from '@/lib/monday-columns'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const ACTIVITY_LOG_URL =
  process.env.N8N_LOG_ACTIVITY_WEBHOOK ||
  'https://stayful.app.n8n.cloud/webhook/log-activity'
const BOOKED_LABEL = 'Booked'

function ok(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 200 })
}

// ── Signature verification ───────────────────────────────────────────────────

function verifyCalendlySignature(
  rawBody: string,
  headerValue: string | null,
  signingKey: string,
): boolean {
  if (!headerValue) return false
  // Header form: "t=<unix>,v1=<hex>" (additional v* versions may follow).
  const parts = new Map<string, string>()
  for (const segment of headerValue.split(',')) {
    const idx = segment.indexOf('=')
    if (idx > 0) parts.set(segment.slice(0, idx).trim(), segment.slice(idx + 1).trim())
  }
  const timestamp = parts.get('t')
  const signature = parts.get('v1')
  if (!timestamp || !signature) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expectedHex = crypto.createHmac('sha256', signingKey).update(signedPayload).digest('hex')

  const a = Buffer.from(expectedHex, 'hex')
  const b = Buffer.from(signature, 'hex')
  if (a.length === 0 || a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// ── Phone helpers ────────────────────────────────────────────────────────────

function extractPhoneFromQA(qaList: unknown): string | null {
  if (!Array.isArray(qaList)) return null
  for (const qa of qaList) {
    const question = String(qa?.question ?? '').toLowerCase()
    if (question.includes('phone')) {
      const answer = String(qa?.answer ?? '').trim()
      if (answer) return answer
    }
  }
  return null
}

// Normalise to E.164. UK is the default country for leading-0 inputs since
// every lead in MANAGEMENT_LEADS_BOARD is UK property.
function normalisePhoneToE164(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return null
  if (hasPlus) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

// ── Monday lookup ────────────────────────────────────────────────────────────

interface MatchedLead {
  id: string
  name: string
  waStatus: string
}

async function findLeadByPhone(phoneE164: string): Promise<MatchedLead | null> {
  // Cast a small net of variants — Monday's phone column can be stored
  // with or without the leading "+" depending on entry path.
  const variants = Array.from(
    new Set([
      phoneE164,
      phoneE164.replace(/^\+/, ''),
      phoneE164.startsWith('+') ? phoneE164 : `+${phoneE164}`,
    ]),
  )
  const variantLiteral = variants.map((v) => `"${v}"`).join(',')

  const firstQuery = `query {
    items_page_by_column_values(
      board_id: ${MANAGEMENT_LEADS_BOARD},
      columns: [{ column_id: "${COL.phoneE164}", column_values: [${variantLiteral}] }],
      limit: 100
    ) {
      cursor
      items {
        id
        name
        column_values(ids: ["${COL.waStatus}"]) { id text }
      }
    }
  }`

  let data: any = await mondayQuery(firstQuery)
  let page: any = data?.items_page_by_column_values

  while (page) {
    const items: any[] = page.items || []
    if (items.length > 0) {
      const item = items[0]
      const waCol = (item.column_values || []).find((c: any) => c.id === COL.waStatus)
      return {
        id: String(item.id),
        name: String(item.name || ''),
        waStatus: String(waCol?.text || ''),
      }
    }
    const cursor: string | null = page.cursor || null
    if (!cursor) break
    const nextQuery = `query {
      next_items_page(cursor: "${cursor}", limit: 100) {
        cursor
        items {
          id
          name
          column_values(ids: ["${COL.waStatus}"]) { id text }
        }
      }
    }`
    data = await mondayQuery(nextQuery)
    page = data?.next_items_page
  }
  return null
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // 1. Signature verification (env-gated until subscription is rotated
    //    with a signing key — see route file header).
    const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
    if (signingKey) {
      const header = req.headers.get('Calendly-Webhook-Signature')
      if (!verifyCalendlySignature(rawBody, header, signingKey)) {
        console.warn('[calendly/webhook] invalid signature')
        return ok({ skipped: true, reason: 'invalid_signature' })
      }
    } else {
      console.warn(
        '[calendly/webhook] CALENDLY_WEBHOOK_SIGNING_KEY not set; signature verification skipped',
      )
    }

    // 2. Parse body.
    let body: any = null
    try {
      body = JSON.parse(rawBody)
    } catch {
      return ok({ skipped: true, reason: 'invalid_json' })
    }

    const eventType = body?.event
    if (eventType !== 'invitee.created') {
      return ok({ skipped: true, reason: 'unhandled_event', event: String(eventType ?? 'unknown') })
    }

    // Calendly v2 puts invitee fields directly on `payload`; the spec calls
    // for `payload.invitee.*`. Support both shapes.
    const payload = body?.payload ?? {}
    const invitee = payload?.invitee ?? payload
    const scheduledEvent =
      payload?.scheduled_event ?? invitee?.scheduled_event ?? payload?.event ?? {}

    // 3. Extract phone.
    const rawPhone = extractPhoneFromQA(invitee?.questions_and_answers)
    if (!rawPhone) {
      console.log('[calendly/webhook] no phone in questions_and_answers')
      return ok({ skipped: true, reason: 'no_phone' })
    }
    const phoneE164 = normalisePhoneToE164(rawPhone)
    if (!phoneE164) {
      console.warn('[calendly/webhook] phone normalisation failed', { rawPhone })
      return ok({ skipped: true, reason: 'phone_normalisation_failed' })
    }

    // 4. Find lead.
    const lead = await findLeadByPhone(phoneE164)
    if (!lead) {
      console.log('[calendly/webhook] no lead match for', phoneE164)
      return ok({ skipped: true, reason: 'no_lead_match', phone: phoneE164 })
    }

    // 5. Idempotency — bail if already Booked.
    if (lead.waStatus.toLowerCase() === BOOKED_LABEL.toLowerCase()) {
      return ok({ skipped: true, reason: 'already_booked', leadId: lead.id })
    }

    // 6. Update Monday.
    const updateJSON = JSON.stringify({
      [COL.waStatus]: { label: BOOKED_LABEL },
      [COL.waCompleted]: { checked: 'true' },
    })
    const mutation = `mutation {
      change_multiple_column_values(
        board_id: ${MANAGEMENT_LEADS_BOARD},
        item_id: ${lead.id},
        column_values: "${escapeJSONForGraphQL(updateJSON)}"
      ) { id }
    }`
    await mondayQuery(mutation)

    // 7. Activity log. Failures here don't fail the webhook — the booking
    //    has already been recorded on the lead.
    const eventName: string = scheduledEvent?.name || 'Web Meeting'
    const startTime: string = scheduledEvent?.start_time || ''
    try {
      await fetch(ACTIVITY_LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          leadName: lead.name,
          eventType: 'Web Meeting Booked',
          source: 'Calendly',
          notes: `${eventName} booked for ${startTime}`,
        }),
      })
    } catch (err) {
      console.error('[calendly/webhook] activity log failed', err)
    }

    return ok({ success: true, leadId: lead.id, leadName: lead.name })
  } catch (err) {
    console.error('[calendly/webhook] handler error', err)
    return ok({ skipped: true, reason: 'handler_error' })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'calendly-webhook' })
}
