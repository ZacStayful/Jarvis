// app/api/sales/summary/route.ts
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function detectType(question?: string, sectionId?: string): string {
  if (sectionId) return "section_observe";
  if (!question) return "briefing";
  const q = question.toLowerCase();
  if (/what.*focus|priority|today|should i do/.test(q)) return "focus_today";
  if (/\bif\b|what if|suppose|hypothetical|were to/.test(q)) return "hypothetical";
  return "general";
}

export async function POST(req: NextRequest) {
  try {
    const { metrics: m, question, sectionId } = await req.json();
    const p = m?.period;
    const s = m?.snapshot;
    const r = m?.rates;
    const e = m?.efficiency;
    if (!p) return NextResponse.json({ error: "No metrics" }, { status: 400 });

    const type = detectType(question, sectionId);

    const system = `You are JARVIS, the AI intelligence layer for Stayful.

Speak directly to Zac Harrison, the founder. Address him as "sir" naturally — not every sentence, but consistently throughout. Your voice is calm, British, intelligent, authoritative. Like JARVIS from Iron Man. Be precise. Use specific numbers always. Never say could or potential — state facts. This is spoken audio — no bullet points, no lists, no markdown. Natural flowing sentences only. 3-4 sentences for briefings. 2-3 for hypotheticals. 1-2 for section observations. End with a single actionable recommendation OR a natural follow-up question — not both. Vary your phrasing. Sound like a brilliant analyst having a conversation, not reading a report.`;

    const ctx = `Pipeline (from 1st May 2026):

${p.totalLeads} leads added. ${p.webMeetingCount} web meetings booked, ${p.webMeetingsSat} sat, ${p.webMeetingsNoShow} no shows. ${p.customersWon} customers won. ${p.presentationsSent} presentations sent, ${p.engaged} engaged (${r.presentationEngagement}%). Snapshot: ${s.pipeline} in pipeline, ${s.warm} warm, ${s.specialOffer} special offer, ${s.booked} booked, ${s.noShow} no shows, ${s.customer} total customers. Rates: ${r.attendanceRate}% attendance, ${r.postMeetingClose}% post-meeting close, ${r.overallConversion}% overall. Efficiency: ${e.avgCallsPostMeeting} avg calls per post-meeting lead, ${e.avgEmailsPostMeeting} avg emails. Offers: ${m.offers?.active} active, ${m.offers?.expiringThisWeek} expiring this week.`;

    const sectionCtx: Record<string, string> = {
      funnel: `Funnel: ${p.totalLeads} leads added, ${p.webMeetingCount} booked, ${p.webMeetingsSat} sat, ${p.customersWon} converted.`,
      pipeline: `Pipeline: ${s.pipeline} to contact, ${s.warm} warm, ${s.specialOffer} with offers, ${s.noShow} no shows to re-engage.`,
      outreach: `Outreach: ${p.presentationsSent} presentations sent, ${p.engaged} engaged (${r.presentationEngagement}%), ${p.callsInPeriod} calls.`,
      efficiency: `Efficiency: ${e.avgCallsPostMeeting} avg calls and ${e.avgEmailsPostMeeting} avg emails per post-meeting lead.`,
      abandonment: `Abandonment: ${m.abandonment?.total} dropped off. Top reason: ${m.abandonment?.topReasons?.[0]?.reason || "not recorded"} (${m.abandonment?.topReasons?.[0]?.count || 0}).`,
      offers: `Offers: ${m.offers?.active} active, ${m.offers?.expiringThisWeek} expiring this week, ${m.offers?.expiringThisMonth} this month.`,
      query: `Ready for analysis. ${p.totalLeads} leads in the dataset since 1st May.`,
    };

    const prompts: Record<string, string> = {
      briefing: `${ctx}

Give Zac a 3-4 sentence pipeline briefing. Lead with the most urgent item. Give the headline number. Identify the biggest opportunity. End with one specific action for today.`,
      focus_today: `${ctx}

Zac wants to know what to focus on today. Give 3 specific priorities in order of urgency. Name the actual metric or person. No generic advice. End by confirming these are his top three.`,
      hypothetical: `${ctx}

Zac asks: ${question}
Show the exact calculation in plain spoken language. State the implication. Give one action recommendation.`,
      section_observe: `${sectionCtx[sectionId || ""] || ctx}

Give a 1-2 sentence contextual observation. Highlight something noteworthy or actionable. Sound like a trusted analyst, not a narrator.`,
      general: `${ctx}

Zac asks: ${question}
Answer directly using the data. Be specific. End with a follow-up question that would help him go deeper.`,
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system,
        messages: [{ role: "user", content: prompts[type] || prompts.general }],
      }),
    });

    const data = await resp.json();
    const text = data.content?.[0]?.text || "I was unable to generate a response, sir.";
    return NextResponse.json({ summary: text, type, followUp: type === "general" || type === "hypothetical" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown", summary: "I encountered an error, sir. Please try again." }, { status: 500 });
  }
}
