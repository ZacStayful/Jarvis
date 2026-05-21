import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { metrics, question } = await req.json();
    const p = metrics?.period;
    const s = metrics?.snapshot;
    const r = metrics?.rates;
    if (!p) return NextResponse.json({ error: "No metrics" }, { status: 400 });

    const system = `You are JARVIS, Stayful's AI intelligence layer.

Speak directly to Zac, the founder. Be precise, confident, brief. Use specific numbers always. Apply VALIDATE then REFRAME then QUANTIFY when analysing drop-offs. Reference "revenue floor" not "minimum income". For hypotheticals: show the exact calculation, then the implication. Maximum 4 sentences for summaries. Maximum 3 sentences for hypotheticals.`;

    const context = `Current pipeline data:

Period metrics: ${p.totalLeads} leads added, ${p.webMeetingsSat} web meetings sat, ${p.webMeetingsMissed} no shows, ${p.webMeetingsUpcoming} upcoming, ${p.customersWon} customers won, ${p.presentationsSent} presentations sent, ${p.presentationsViewed} viewed (${r.presentationEngagement}% engagement), ${p.callsMade} calls. Live snapshot: ${s.qualified} qualified, ${s.booked} booked, ${s.noShow} no shows, ${s.warm} warm, ${s.specialOffer} special offer, ${s.customer} total customers, ${s.future} future. Rates: ${r.webMeetingRate}% meeting rate, ${r.attendanceRate}% attendance, ${r.customerRate}% conversion, ${r.postMeetingClose}% post-meeting close. Offers expiring this week: ${metrics.offers?.expiringThisWeek}.`;

    const userMsg = question
      ? `${context}\n\nZac asks: ${question}\n\nAnswer directly. Show calculation if hypothetical. Give one clear action.`
      : `${context}\n\nGive Zac a 4-sentence pipeline briefing. Identify the biggest drop-off. Flag fast-path signals. Name one action for today.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await response.json();
    const text = data.content?.[0]?.text || "Unable to generate summary.";
    return NextResponse.json({ summary: text, isHypothetical: !!question });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
