// app/api/lucy/voice/complete/route.ts
// Retell post-call webhook. Configured as the agent's post-call webhook
// URL. Runs once per call after Retell finishes processing it. Looks the
// caller up in MANAGEMENT_LEADS_BOARD by `from_number`, stores the
// recording as an actual file on the Monday item (not just a link —
// Retell's S3 URLs expire), and updates quality-metric counters.
//
// Quality-metric logic:
//   - disconnection_reason === "user_hangup" AND the last transcript line
//     was the agent → AI Detection Count +1, Dropped Calls +1, plus a
//     Monday update note flagging the call for humanisation review.
//   - disconnection_reason in UNEXPECTED_DISCONNECTS (voicemail,
//     no_answer, line_error, busy, user_hangup_early, inactivity,
//     machine_detected, …) → Dropped Calls +1 only.
//   - disconnection_reason === "agent_hangup" or "user_hangup" with the
//     lead speaking last → natural close, no counter change.
//
// Always returns 200 — Retell retries on non-2xx and a disabled webhook
// silently breaks the whole quality-metrics loop. Errors are caught and
// surfaced as { skipped: true, reason: "..." } payloads inside the 200.

import { NextRequest, NextResponse } from 'next/server'
import { findLeadByPhone, normalisePhoneToE164 } from '@/lib/monday-leads'
import { mondayQuery } from '@/lib/monday-client'
import {
  MANAGEMENT_LEADS_BOARD,
  MANAGEMENT_LEADS_COLUMNS as COL,
} from '@/lib/monday-columns'

export const dynamic = 'force-dynamic'
// Download + re-upload of the recording is the slowest hop here; 60s
// keeps headroom for typical 1-5MB MP3s plus Monday's processing time.
export const maxDuration = 60

// Reasons that mean the call never reached a clean conclusion. Sourced
// from Retell's disconnection_reason enum; "agent_hangup" is excluded
// because Lucy ends cleanly on success. "user_hangup" is handled
// separately because it splits on who spoke last.
const UNEXPECTED_DISCONNECTS = new Set([
  'voicemail',
  'no_answer',
  'line_error',
  'busy',
  'user_hangup_early',
  'inactivity',
  'machine_detected',
  'concurrency_limit_reached',
  'dial_failed',
  'max_duration_reached',
  'error_llm_websocket_open',
  'error_llm_websocket_lost_connection',
  'error_llm_websocket_runtime',
  'error_llm_websocket_corrupt_payload',
  'error_no_audio_received',
  'error_asr',
  'error_unknown',
])

function ok(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 200 })
}

// Determine who spoke last. Retell typically sends transcript_object as
// an array of { role: "agent" | "user", content }; fall back to parsing
// the plain `transcript` string when only that is present.
function lastSpeaker(call: any): 'agent' | 'user' | null {
  const transcriptObj = call?.transcript_object
  if (Array.isArray(transcriptObj) && transcriptObj.length > 0) {
    for (let i = transcriptObj.length - 1; i >= 0; i--) {
      const role = String(transcriptObj[i]?.role || '').toLowerCase()
      if (role === 'agent') return 'agent'
      if (role === 'user') return 'user'
    }
  }

  const transcript = String(call?.transcript || '')
  if (!transcript) return null
  const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].toLowerCase()
    if (line.startsWith('agent:')) return 'agent'
    if (line.startsWith('user:')) return 'user'
  }
  return null
}

// Read current numeric value then write +1. Monday has no native
// increment mutation, so this is a read-modify-write — race conditions
// only matter if two webhooks fire for the same lead within ~1s, which
// in practice doesn't happen (Retell delivers post-call events serially
// per call).
async function incrementNumeric(itemId: string, columnId: string): Promise<number> {
  const data: any = await mondayQuery(`query {
    items(ids: [${itemId}]) {
      column_values(ids: ["${columnId}"]) { text }
    }
  }`)
  const currentText = data?.items?.[0]?.column_values?.[0]?.text || '0'
  const current = Number.parseInt(currentText, 10) || 0
  const next = current + 1

  await mondayQuery(`mutation {
    change_simple_column_value(
      board_id: ${MANAGEMENT_LEADS_BOARD},
      item_id: ${itemId},
      column_id: "${columnId}",
      value: "${next}"
    ) { id }
  }`)

  return next
}

// Download the Retell recording and upload it to Monday as a real file
// attachment on the Call Recordings column. Monday's file columns only
// accept multipart uploads via add_file_to_column — you can't set them
// with a URL via change_column_value.
async function attachRecordingToItem(
  itemId: string,
  recordingUrl: string,
  callId: string,
  token: string,
): Promise<void> {
  const recordingRes = await fetch(recordingUrl)
  if (!recordingRes.ok) {
    throw new Error(`recording_download_failed_${recordingRes.status}`)
  }
  const recordingBlob = await recordingRes.blob()

  const dateStamp = new Date().toISOString().split('T')[0]
  const filename = `lucy-call-${dateStamp}-${callId || 'recording'}.mp3`

  // Monday's file upload uses the GraphQL multipart spec
  // (https://github.com/jaydenseric/graphql-multipart-request-spec).
  const form = new FormData()
  form.append(
    'query',
    `mutation ($file: File!) {
      add_file_to_column(item_id: ${itemId}, column_id: "${COL.callRecording}", file: $file) {
        id
      }
    }`,
  )
  form.append('map', JSON.stringify({ file_data: ['variables.file'] }))
  form.append('file_data', recordingBlob, filename)

  const uploadRes = await fetch('https://api.monday.com/v2/file', {
    method: 'POST',
    headers: { Authorization: token },
    body: form,
  })

  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '')
    throw new Error(`monday_upload_failed_${uploadRes.status}_${body.slice(0, 120)}`)
  }
}

async function postUpdate(itemId: string, body: string): Promise<void> {
  const escaped = JSON.stringify(body)
  await mondayQuery(`mutation {
    create_update(item_id: ${itemId}, body: ${escaped}) { id }
  }`)
}

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY
  if (!MONDAY_API_KEY) {
    console.error('[lucy/voice/complete] MONDAY_API_KEY not configured')
    return ok({ skipped: true, reason: 'monday_token_missing' })
  }

  let payload: any = null
  try {
    payload = await req.json()
  } catch {
    return ok({ skipped: true, reason: 'invalid_json' })
  }

  // Tolerate a few shapes. Retell's standard webhook nests the call under
  // `call` and uses `event` for the type; some tools strip the envelope.
  const eventType: string = String(payload?.event ?? '')
  const call = payload?.call ?? payload?.call_inbound ?? payload ?? {}

  const fromNumber = String(call?.from_number ?? '')
  const callId = String(call?.call_id ?? '')
  const recordingUrl: string | null = call?.recording_url || null
  const disconnectionReason = String(call?.disconnection_reason ?? '').toLowerCase()

  if (!fromNumber) {
    console.warn('[lucy/voice/complete] no from_number', { eventType, callId })
    return ok({ skipped: true, reason: 'no_from_number', callId })
  }

  const phoneE164 = normalisePhoneToE164(fromNumber)
  if (!phoneE164) {
    return ok({ skipped: true, reason: 'phone_normalisation_failed', fromNumber })
  }

  let lead
  try {
    lead = await findLeadByPhone(phoneE164, [
      COL.callRecording,
      COL.aiDetectionCount,
      COL.droppedCalls,
    ])
  } catch (err) {
    console.error('[lucy/voice/complete] lead lookup failed', err)
    return ok({ skipped: true, reason: 'lead_lookup_failed' })
  }

  if (!lead) {
    console.log('[lucy/voice/complete] no lead match for', phoneE164)
    return ok({ skipped: true, reason: 'no_lead_match', phone: phoneE164 })
  }

  const actions: string[] = []
  const errors: Record<string, string> = {}

  // 1. Attach recording to the Monday file column. Failure here doesn't
  //    block the metrics writes — those are independent.
  if (recordingUrl) {
    try {
      await attachRecordingToItem(lead.id, recordingUrl, callId, MONDAY_API_KEY)
      actions.push('recording_attached')
    } catch (err) {
      errors.recording = err instanceof Error ? err.message : String(err)
      console.error('[lucy/voice/complete] recording attach failed', err)
    }
  }

  // 2. Quality-metric counters. Two paths share a guard so we never
  //    double-count: AI-detection implies dropped-call, but the natural-
  //    user-hangup case doesn't increment either.
  const speaker = lastSpeaker(call)
  let aiDetected = false
  let dropped = false

  if (disconnectionReason === 'user_hangup' && speaker === 'agent') {
    aiDetected = true
    dropped = true
  } else if (UNEXPECTED_DISCONNECTS.has(disconnectionReason)) {
    dropped = true
  }

  if (aiDetected) {
    try {
      const next = await incrementNumeric(lead.id, COL.aiDetectionCount)
      actions.push(`ai_detection_count=${next}`)
    } catch (err) {
      errors.ai_detection = err instanceof Error ? err.message : String(err)
    }
  }

  if (dropped) {
    try {
      const next = await incrementNumeric(lead.id, COL.droppedCalls)
      actions.push(`dropped_calls=${next}`)
    } catch (err) {
      errors.dropped_calls = err instanceof Error ? err.message : String(err)
    }
  }

  if (aiDetected) {
    try {
      await postUpdate(
        lead.id,
        'Lucy call dropped mid-conversation — possible AI detection. Review Lucy humanisation.',
      )
      actions.push('ai_detection_update_posted')
    } catch (err) {
      errors.update_note = err instanceof Error ? err.message : String(err)
    }
  }

  console.log(
    `[lucy/voice/complete] ${phoneE164} → ${lead.name} (item ${lead.id}) — ${eventType || 'no-event'} — ${disconnectionReason || 'no-reason'} — ${actions.join(',') || 'no-actions'}`,
  )

  return ok({
    success: true,
    leadId: lead.id,
    leadName: lead.name,
    callId,
    eventType,
    disconnectionReason,
    lastSpeaker: speaker,
    aiDetected,
    dropped,
    actions,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  })
}

// Probe so curl / Retell's "test URL" button gets a sane response on GET.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'lucy-voice-complete' })
}
