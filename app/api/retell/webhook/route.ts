// app/api/retell/webhook/route.ts
// Retell webhook receiver — handles call_ended and call_analyzed events.
//
// call_ended:
//   - Logs recording link + transcript to Monday item updates.
//   - Stamps no-answer date columns when the call failed to connect.
//
// call_analyzed:
//   - Writes the transcript into the Web Meeting Transcripts long_text column.
//   - Stamps Last Phoned Answered with today's date.
//   - Generates a cumulative call summary via Anthropic and writes it back.
//   - Maps Retell's lost_reason custom-analysis field to Monday's Lost Reason
//     dropdown and flips status to Abandoned.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BOARD_ID = '5891626711';

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'Monday API key not configured' }, { status: 500 });

  try {
    const event = await req.json();
    const eventType = event?.event;
    const call = event?.call;

    if (!call) {
      return NextResponse.json({ error: 'No call data in webhook payload' }, { status: 400 });
    }

    const callId = call.call_id;
    const recordingUrl = call.recording_url || null;
    const durationMs = call.duration_ms || 0;
    const durationMins = durationMs ? Math.round((durationMs / 60000) * 10) / 10 : null;
    const disconnectionReason = call.disconnection_reason || null;
    const transcript: string | null = call.transcript || null;
    const dynamicVars = call.retell_llm_dynamic_variables || {};
    const mondayItemId = dynamicVars.monday_item_id || null;
    const startTimestamp = call.start_timestamp;

    const callDate = startTimestamp
      ? new Date(startTimestamp).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London',
        })
      : new Date().toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London',
        });

    const callTime = startTimestamp
      ? new Date(startTimestamp).toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        })
      : null;

    if (!mondayItemId) {
      console.warn('[retell/webhook] No monday_item_id in dynamic variables', { callId, dynamicVars });
      return NextResponse.json({ success: true, warning: 'No monday_item_id — not logged to Monday', callId });
    }

    const updates: string[] = [];

    // ─── call_ended ─────────────────────────────────────────────────────────
    if (eventType === 'call_ended') {
      if (recordingUrl) {
        const durationNote = durationMins ? ` (${durationMins} min${durationMins !== 1 ? 's' : ''})` : '';
        const timeNote = callTime ? ` at ${callTime}` : '';
        const recordingBody = `**📞 Call Recording — ${callDate}${timeNote}${durationNote}**\n\n🎙️ [Listen to recording](${recordingUrl})\n\nCall ID: ${callId}`;

        const recordingRes = await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: MONDAY_API_KEY, 'API-Version': '2024-01' },
          body: JSON.stringify({
            query: `mutation { create_update(item_id: ${mondayItemId}, body: ${JSON.stringify(recordingBody)}) { id } }`,
          }),
        });

        const recordingData = await recordingRes.json();
        if (!recordingData.errors) updates.push('recording_logged');
      }

      if (transcript && transcript.length > 50) {
        const transcriptBody = `**📝 Call Transcript — ${callDate}**\n\n${transcript}`;

        await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: MONDAY_API_KEY, 'API-Version': '2024-01' },
          body: JSON.stringify({
            query: `mutation { create_update(item_id: ${mondayItemId}, body: ${JSON.stringify(transcriptBody)}) { id } }`,
          }),
        });

        updates.push('transcript_update_logged');
      }

      const noAnswerReasons = ['voicemail', 'no_answer', 'line_error', 'busy', 'user_hangup_early'];
      if (noAnswerReasons.includes(disconnectionReason)) {
        const today = new Date().toISOString().split('T')[0];
        const colVals = JSON.stringify({
          date_mm0fv708: { date: today },
          date6: { date: today },
          date_mm1jj0vr: { date: today },
        });

        await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: MONDAY_API_KEY, 'API-Version': '2024-01' },
          body: JSON.stringify({
            query: `mutation { change_multiple_column_values(board_id: ${BOARD_ID}, item_id: ${mondayItemId}, column_values: ${JSON.stringify(colVals)}) { id } }`,
          }),
        });

        updates.push('no_answer_columns_updated');
      }
    }

    // ─── call_analyzed ──────────────────────────────────────────────────────
    if (eventType === 'call_analyzed') {
      const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
      const leadName = dynamicVars.lead_name || 'the lead';
      const address = dynamicVars.address || '';
      const leadProfile = dynamicVars.lead_profile || '';

      if (transcript && transcript.length > 50) {
        await updateMondayLongText(mondayItemId, 'long_text_mm231qgr', transcript, MONDAY_API_KEY);
        updates.push('transcript_column_written');
      }

      const today = new Date().toISOString().split('T')[0];
      await updateMondayDate(mondayItemId, 'date_mm1vpqam', today, MONDAY_API_KEY);
      updates.push('last_phoned_answered_stamped');

      if (ANTHROPIC_KEY && transcript && transcript.length > 50) {
        const existingSummary = await getMondayLongText(mondayItemId, 'long_text_mm239abs', MONDAY_API_KEY);
        const updatedSummary = await generateCumulativeSummary({
          existingSummary,
          transcript,
          leadName,
          address,
          leadProfile,
          callDate,
          apiKey: ANTHROPIC_KEY,
        });
        await updateMondayLongText(mondayItemId, 'long_text_mm239abs', updatedSummary, MONDAY_API_KEY);
        updates.push('call_summary_updated');
      } else if (!ANTHROPIC_KEY) {
        console.warn('[retell/webhook] ANTHROPIC_API_KEY not set — call summary skipped');
      }

      const customAnalysisData = call.call_analysis?.custom_analysis_data || {};
      const lostReason: string = customAnalysisData.lost_reason || 'none';

      const lostReasonMap: Record<string, string> = {
        decided_to_long_let: 'Decided to long let property',
        decided_to_sell: 'Decided to sell',
        setup_costs_too_high: 'Setup costs too high',
        want_local_company: 'Want local company',
        gone_with_another_company: 'Gone with another company',
        income_prediction_too_low: 'Income prediction too low',
        want_to_self_manage: 'want to try and self manage',
        does_not_fit_with_stayful: 'does not fit with Stayful',
      };

      if (lostReason !== 'none' && lostReasonMap[lostReason]) {
        const lostColVals = JSON.stringify({
          color_mm1v2s3m: { label: lostReasonMap[lostReason] },
          status5: { label: 'Abandoned' },
        });
        await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: MONDAY_API_KEY, 'API-Version': '2024-01' },
          body: JSON.stringify({
            query: `mutation { change_multiple_column_values(board_id: ${BOARD_ID}, item_id: ${mondayItemId}, column_values: ${JSON.stringify(lostColVals)}) { id } }`,
          }),
        });
        updates.push('lost_reason_and_status_updated');
      }
    }

    return NextResponse.json({
      success: true,
      callId,
      mondayItemId,
      eventType,
      recordingUrl,
      durationMins,
      disconnectionReason,
      updates,
    });
  } catch (err) {
    console.error('[retell/webhook] error:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// ─── Monday helpers ───────────────────────────────────────────────────────────

async function getMondayLongText(itemId: string, columnId: string, token: string): Promise<string> {
  const query = `
    query {
      items(ids: [${itemId}]) {
        column_values(ids: ["${columnId}"]) {
          text
        }
      }
    }
  `;
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'API-Version': '2024-01' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return data?.data?.items?.[0]?.column_values?.[0]?.text || '';
}

async function updateMondayLongText(itemId: string, columnId: string, text: string, token: string) {
  const value = JSON.stringify({ text });
  const query = `
    mutation {
      change_column_value(
        board_id: ${BOARD_ID},
        item_id: ${itemId},
        column_id: "${columnId}",
        value: ${JSON.stringify(value)}
      ) { id }
    }
  `;
  await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'API-Version': '2024-01' },
    body: JSON.stringify({ query }),
  });
}

async function updateMondayDate(itemId: string, columnId: string, date: string, token: string) {
  const value = JSON.stringify({ date });
  const query = `
    mutation {
      change_column_value(
        board_id: ${BOARD_ID},
        item_id: ${itemId},
        column_id: "${columnId}",
        value: ${JSON.stringify(value)}
      ) { id }
    }
  `;
  await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'API-Version': '2024-01' },
    body: JSON.stringify({ query }),
  });
}

// ─── Cumulative summary via Anthropic ─────────────────────────────────────────

async function generateCumulativeSummary({
  existingSummary,
  transcript,
  leadName,
  address,
  leadProfile,
  callDate,
  apiKey,
}: {
  existingSummary: string;
  transcript: string;
  leadName: string;
  address: string;
  leadProfile: string;
  callDate: string;
  apiKey: string;
}): Promise<string> {
  const isFirstCall = !existingSummary || existingSummary.trim() === '';

  const systemPrompt = `You are a sales intelligence assistant for Stayful, a short-term letting management company in the UK.
Your job is to produce structured cumulative lead summaries from AI voice agent call transcripts.
These summaries are used by the voice agent Lucy to personalise her opener on the next call and to handle objections more effectively.
Be concise and structured. Use only the specified fields. No filler, no waffle.`;

  const firstCallPrompt = `This is the first call with ${leadName} regarding their property at ${address}.
Lead profile context: ${leadProfile || 'Not yet known'}
Call date: ${callDate}

Transcript:
${transcript}

Produce a structured summary using exactly these fields and labels:

PROPERTY_SITUATION: [Type of landlord, current setup, what they do with the property now]
CORE_MOTIVATION: [Why they are exploring short-term letting — the real reason behind the enquiry]
OBJECTIONS_RAISED: [List each objection. Format each as: "Objection name — status: raised / resolved / unresolved". If none, write "None yet"]
BUYING_SIGNALS: [Any moments of genuine interest, forward-looking questions, or statements of urgency. If none, write "None yet"]
OPEN_QUESTIONS: [What Lucy still needs to find out on the next call to progress conversion]
EMOTIONAL_PROFILE: [Lead's tone — choose from: anxious / analytical / excited / sceptical / warming / mixed. Add one sentence of context]
LAST_CALL_OUTCOME: [How the call ended. What was agreed or said at close]
LAST_CALL_DATE: ${callDate}`;

  const returnCallPrompt = `This lead has spoken with Lucy before. Below is the existing cumulative summary followed by the latest call transcript.
Update the summary: carry everything forward, mark resolved objections as resolved, add new objections and signals, remove answered open questions and add new ones.

Lead: ${leadName}
Property: ${address}
Call date: ${callDate}

EXISTING SUMMARY:
${existingSummary}

NEW CALL TRANSCRIPT:
${transcript}

Produce an updated structured summary using exactly these fields and labels:

PROPERTY_SITUATION: [Carry forward. Update only if new information was revealed]
CORE_MOTIVATION: [Carry forward. Update if motivation became clearer or shifted]
OBJECTIONS_RAISED: [Full cumulative list with current status for each: raised / resolved / unresolved. Flag any objection that returned after appearing resolved as "re-raised"]
BUYING_SIGNALS: [Cumulative — carry forward previous signals and add any new ones from this call]
OPEN_QUESTIONS: [Remove questions answered this call. Add new gaps identified]
EMOTIONAL_PROFILE: [Update based on latest call. Note any shift in tone from previous calls]
LAST_CALL_OUTCOME: [How this specific call ended. What was agreed or said at close]
LAST_CALL_DATE: ${callDate}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: isFirstCall ? firstCallPrompt : returnCallPrompt }],
    }),
  });

  const data = await response.json();
  const summaryText: string | undefined = data?.content?.[0]?.text;

  if (!summaryText) {
    console.error('[retell/webhook] Anthropic API response error:', JSON.stringify(data));
    return existingSummary || 'Summary unavailable';
  }

  return summaryText;
}
