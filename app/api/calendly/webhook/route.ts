// app/api/calendly/webhook/route.ts
// Calendly webhook receiver. Currently a stub that 200s every request so
// we can register the subscription (api.calendly.com expects the URL to
// be live and accept POSTs before it'll accept invitee.created events).
//
// Future work — when a real handler is wired in this should:
//   1. Verify the Calendly-Webhook-Signature header against the signing
//      key returned at subscription creation time.
//   2. For invitee.created: look up the lead in Monday by email/phone,
//      flip waStatus → Booked, append the meeting time to notes, log
//      to the activity webhook.
//   3. Idempotency: Calendly retries on non-2xx, so dedupe on the
//      payload's event URI before mutating Monday.

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    // Log enough to debug deliveries without dumping full payloads.
    const eventType =
      (body && typeof body === 'object' && 'event' in body && typeof body.event === 'string'
        ? body.event
        : 'unknown')
    console.log('[calendly/webhook] received', {
      event: eventType,
      hasPayload: !!body?.payload,
    })
  } catch (err) {
    console.error('[calendly/webhook] parse failed', err)
  }
  // Always 200 — Calendly retries on non-2xx and will auto-disable the
  // subscription after sustained failures.
  return NextResponse.json({ received: true })
}

// Calendly probes some endpoints with GET during subscription setup.
// Respond cleanly so the dashboard's connection check doesn't show
// red.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'calendly-webhook' })
}
