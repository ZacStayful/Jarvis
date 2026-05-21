import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { metrics: m, question } = await req.json();
    const p = m?.period;
    const s = m?.snapshot;
    const r = m?.rates;
    const e = m?.efficiency;
    if (!p) return NextResponse.json({ error: "No metrics" }, { status: 400 });

    const system = `You are JARVIS, Stayful's AI intelligence layer. Speak directly to Zac.

Be precise, confident, brief. Always use specific numbers. Never say "potential" or "could". For hypotheticals: state the exact calculation then the implication in one sentence. For summaries: 4 sentences max. Identify the biggest drop-off. Name one action for today. VALIDATE then REFRAME then QUANTIFY when analysing problems. Use "revenue floor" language.`;

    const ctx = `Pipeline data:

Period: ${p.totalLeads} leads added, ${p.webMeetingSat} meetings sat, ${p.webMeetingNoShow} no shows, ${p.webMeetingUpcoming} upcoming, ${p.customersWon} customers won, ${p.presentationsSent} presentations sent, ${p.engaged} engaged (${r.presentationEngagement}%). Snapshot: ${s.pipeline} in pipeline, ${s.booked} booked, ${s.noShow} no shows, ${s.warm} warm, ${s.specialOffer} special offer, ${s.customer} total customers. Rates: ${r.qualificationRate}% qualification, ${r.meetingBookingRate}% pipeline→meeting, ${r.attendanceRate}% attendance, ${r.specialOfferRate}% offer rate, ${r.postMeetingClose}% post-meeting close (excludes abandoned), ${r.overallConversion}% overall. Efficiency: avg ${e.avgCallsToBookMeeting} calls to book meeting, ${e.avgCallsCustomer} calls per customer, ${e.avgEmailsPostMeeting} emails per post-meeting lead. Offers expiring this week: ${m.offers?.expiringThisWeek}.`;

    const userMsg = question
      ? `${ctx}

Zac asks: ${question}
Answer directly. Show calculation if hypothetical. Give one clear action.`
      : `${ctx}
Give Zac a 4-sentence pipeline briefing. Biggest drop-off first. One action for today.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    const data = await resp.json();
    const text = data.content?.[0]?.text || "Unable to generate summary.";
    return NextResponse.json({ summary: text, isHypothetical: !!question });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
