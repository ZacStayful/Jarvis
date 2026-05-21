// components/sales/SalesDashboard.tsx
// Inline component — mounted inside Jarvis shell like LucyView.
// No router, no own voice. Main Jarvis voice handles navigation.
"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const S = {
  bg: "#080c09", surface: "#0e1410", surface2: "#131a14",
  border: "rgba(93,129,86,0.15)", borderHi: "rgba(93,129,86,0.4)",
  green: "#5d8156", greenDim: "#3d5738", greenHi: "#7aa872",
  greenPale: "rgba(93,129,86,0.08)",
  amber: "#c8922a", red: "#9b3a3a", blue: "#3a6b9b", purple: "#9d50dd",
  text: "#e8ede7", textDim: "#7a8f79", textMuted: "#3d4e3c",
};

interface M {
  period: {
    totalLeads: number; webMeetingSat: number; webMeetingNoShow: number;
    webMeetingUpcoming: number; totalWebMeetings: number; customersWon: number;
    abandonedInPeriod: number; presentationsSent: number; engaged: number;
    callsMadeInPeriod: number;
  };
  snapshot: {
    cold: number; qualified: number; futureFromCall: number; futureGeneral: number;
    pipeline: number; booked: number; noShow: number; warm: number;
    specialOffer: number; customer: number; abandonedAll: number; totalOnBoard: number;
  };
  rates: {
    presentationEngagement: number; qualificationRate: number; meetingBookingRate: number;
    attendanceRate: number; specialOfferRate: number; warmRate: number;
    postMeetingClose: number; overallConversion: number; periodConversion: number;
  };
  efficiency: {
    avgCallsPostMeeting: number; avgCallsCustomer: number; avgCallsToBookMeeting: number;
    totalAnsweredCallsPool: number; avgEmailsPostMeeting: number; avgEmailsCustomer: number;
    emailTrackingPoolSize: number; custEmailTrackingPoolSize: number;
    postMeetingPoolSize: number; customerPoolSize: number;
  };
  abandonment: {
    total: number; withReason: number; noReason: number; postMeetingAbandoned: number;
    topReasons: { reason: string; count: number }[];
  };
  offers: {
    active: number; expiringThisWeek: number; expiringThisMonth: number;
    items: { id: string; name: string; profile: string; offerType: string; expiry: string; daysLeft: number | null; address: string }[];
  };
  whatsapp: { messagesSent: number; contacted: number; replies: number; replyRate: number; active: boolean };
  dateRange: { from: string | null; to: string | null; filtered: boolean };
}

export function SalesDashboard() {
  const [m, setM] = useState<M | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<"week" | "month" | "year" | "custom">("month");
  const [cf, setCf] = useState("");
  const [ct, setCt] = useState("");
  const [chunk, setChunk] = useState("funnel");

  const range = useCallback(() => {
    const now = new Date();
    if (preset === "week")  { const f = new Date(now); f.setDate(f.getDate() - 7);  return { from: f.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }; }
    if (preset === "month") { const f = new Date(now); f.setDate(f.getDate() - 30); return { from: f.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }; }
    if (preset === "year")  { const f = new Date(now); f.setFullYear(f.getFullYear() - 1); return { from: f.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }; }
    if (cf && ct) return { from: cf, to: ct };
    return { from: null, to: null };
  }, [preset, cf, ct]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = range();
      const p = new URLSearchParams();
      if (r.from) p.set("from", r.from);
      if (r.to) p.set("to", r.to);
      const res = await fetch(`/api/sales?${p}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setM(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ width: "100%", fontFamily: "Rajdhani, sans-serif", color: S.text }}>
      {/* Sub-header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: S.textDim }}>SALES INTELLIGENCE</span>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: loading ? S.amber : error ? S.red : "#4ade80", animation: loading ? "pulse 1.5s ease infinite" : "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DatePicker preset={preset} onPreset={setPreset} from={cf} to={ct} onFrom={setCf} onTo={setCt} />
          <button onClick={load} className="mono" style={{ fontSize: 8, background: S.surface, border: `1px solid ${S.border}`, color: S.textDim, padding: "3px 8px", borderRadius: 3, cursor: "pointer", letterSpacing: "0.06em" }}>REFRESH</button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <div className="mono" style={{ color: S.red, marginBottom: 10 }}>{error}</div>
          <button onClick={load} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.greenHi, padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 9 }}>RETRY</button>
        </div>
      ) : (
        <div>
          <Sec id="funnel"      n="01" label="Sales Funnel"          active={chunk === "funnel"}      onClick={() => setChunk("funnel")}      loading={loading}>{m && <Funnel m={m} />}</Sec>
          <D label="Live Pipeline" />
          <Sec id="pipeline"    n="02" label="Pipeline Snapshot"     active={chunk === "pipeline"}    onClick={() => setChunk("pipeline")}    loading={loading}>{m && <Pipeline m={m} />}</Sec>
          <D label="Outreach & Engagement" />
          <Sec id="outreach"    n="03" label="Outreach Activity"     active={chunk === "outreach"}    onClick={() => setChunk("outreach")}    loading={loading}>{m && <Outreach m={m} />}</Sec>
          <D label="Efficiency Metrics" />
          <Sec id="efficiency"  n="04" label="Activity to Convert"   active={chunk === "efficiency"}  onClick={() => setChunk("efficiency")}  loading={loading}>{m && <Efficiency m={m} />}</Sec>
          <D label="Drop-off Intelligence" />
          <Sec id="abandonment" n="05" label="Why Leads Drop Off"    active={chunk === "abandonment"} onClick={() => setChunk("abandonment")} loading={loading}>{m && <Abandonment m={m} />}</Sec>
          <D label="Offer Management" />
          <Sec id="offers"      n="06" label="Special Offers"        active={chunk === "offers"}      onClick={() => setChunk("offers")}      loading={loading}>{m && <Offers m={m} />}</Sec>
          <D label="JARVIS Analysis" />
          <Sec id="query"       n="07" label="Ask JARVIS"            active={chunk === "query"}       onClick={() => setChunk("query")}       loading={false}>{m && <Query m={m} />}</Sec>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function Sec({ id, n, label, active, onClick, loading, children }: any) {
  return (
    <div onClick={onClick} style={{ borderBottom: `1px solid ${S.border}`, padding: "18px 20px", cursor: "default", background: active ? "rgba(93,129,86,0.03)" : "transparent", borderLeft: active ? `2px solid ${S.green}` : "2px solid transparent", animation: "fadeUp .3s ease both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{ fontSize: 8, color: S.textMuted }}>{n} /</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase" }}>{label}</span>
        </div>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: loading ? S.amber : S.green, animation: loading ? "pulse 1.5s ease infinite" : "none" }} />
      </div>
      {loading && id !== "query" ? <Skel /> : children}
    </div>
  );
}
function D({ label }: any) {
  return <div className="mono" style={{ fontSize: 8, color: S.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 20px", background: S.surface, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>{label}<div style={{ flex: 1, height: 1, background: S.border }} /></div>;
}
function Skel() {
  return <div style={{ display: "flex", gap: 8 }}>{[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 60, borderRadius: 5, background: S.surface, animation: "pulse 1.5s ease infinite" }} />)}</div>;
}
function KPI({ label, val, sub, accent, small }: any) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 6, padding: "11px 12px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent || S.green, opacity: .6 }} />
      <div className="mono" style={{ fontSize: 8, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div className="orb" style={{ fontSize: small ? 18 : 22, color: S.text, lineHeight: 1, marginBottom: 2 }}>{val}</div>
      {sub && <div className="mono" style={{ fontSize: 8, color: S.textMuted }}>{sub}</div>}
    </div>
  );
}
function Row({ label, val, note }: { label: string; val: string | number; note?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${S.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{label}</span>
        {note && <span className="mono" style={{ fontSize: 7, color: S.textMuted, background: S.surface2, padding: "0 4px", borderRadius: 2 }}>{note}</span>}
      </div>
      <span className="orb" style={{ fontSize: 16, color: S.greenHi }}>{val}</span>
    </div>
  );
}
function DatePicker({ preset, onPreset, from, to, onFrom, onTo }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 2, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 4, padding: 2 }}>
        {(["week", "month", "year", "custom"] as const).map(p => (
          <button key={p} onClick={(e) => { e.stopPropagation(); onPreset(p); }} className="mono" style={{ padding: "2px 7px", borderRadius: 2, border: "none", cursor: "pointer", fontSize: 7, letterSpacing: "0.06em", background: preset === p ? S.greenPale : "transparent", color: preset === p ? S.greenHi : S.textDim }}>{p.toUpperCase()}</button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 3, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          <input type="date" value={from} onChange={e => onFrom(e.target.value)} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 2, color: S.textDim, padding: "1px 4px", fontSize: 7 }} />
          <ArrowRight size={8} color={S.textMuted} />
          <input type="date" value={to} onChange={e => onTo(e.target.value)} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 2, color: S.textDim, padding: "1px 4px", fontSize: 7 }} />
        </div>
      )}
    </div>
  );
}

// ── Section 01: Sales Funnel (period) ──
function Funnel({ m }: { m: M }) {
  const p = m.period; const r = m.rates;
  const funnel = [
    { label: "Total Leads Added",              val: p.totalLeads,         pct: 100,                                                                                color: S.green,   note: null as string | null },
    { label: "Presentations Sent",             val: p.presentationsSent,  pct: p.totalLeads > 0 ? Math.round(p.presentationsSent / p.totalLeads * 100) : 0,         color: S.greenHi, note: null as string | null },
    { label: "Engaged with Presentation",      val: p.engaged,            pct: p.presentationsSent > 0 ? r.presentationEngagement : 0,                              color: S.blue,    note: `${r.presentationEngagement}% of sent` },
    { label: "Web Meetings Sat",               val: p.webMeetingSat,      pct: p.totalLeads > 0 ? Math.round(p.webMeetingSat / p.totalLeads * 100) : 0,             color: S.amber,   note: null as string | null },
    { label: "Web Meetings — No Show",         val: p.webMeetingNoShow,   pct: p.totalLeads > 0 ? Math.round(p.webMeetingNoShow / p.totalLeads * 100) : 0,          color: S.red,     note: "drop-off", dimmed: true },
    { label: "Web Meetings — Upcoming",        val: p.webMeetingUpcoming, pct: p.totalLeads > 0 ? Math.round(p.webMeetingUpcoming / p.totalLeads * 100) : 0,        color: S.amber,   note: "not yet sat" },
    { label: "Customers Won",                  val: p.customersWon,       pct: p.totalLeads > 0 ? Math.round(p.customersWon / p.totalLeads * 100) : 0,              color: S.green,   note: `${r.periodConversion}% conversion` },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Total Leads"      val={p.totalLeads}        sub="Added in period" />
        <KPI label="Web Meetings Sat" val={p.webMeetingSat}     sub="Attended" accent={S.amber} />
        <KPI label="No Shows"         val={p.webMeetingNoShow}  sub="Missed meeting" accent={S.red} />
        <KPI label="Customers Won"    val={p.customersWon}      sub={`${r.periodConversion}% of leads`} accent={S.greenHi} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {funnel.map((row, i) => (
          <div key={i} style={{ opacity: (row as any).dimmed ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(row as any).dimmed && <span style={{ color: S.red, fontSize: 8 }}>▼</span>}
                <span className="mono" style={{ fontSize: 9, color: (row as any).dimmed ? S.textMuted : S.textDim }}>{row.label}</span>
                {row.note && <span className="mono" style={{ fontSize: 7, color: S.textMuted, background: S.surface2, padding: "0 4px", borderRadius: 2 }}>{row.note}</span>}
              </div>
              <span className="mono" style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}>{row.val}</span>
            </div>
            <div style={{ height: 5, background: S.surface2, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${Math.max(row.pct, row.val > 0 ? 1 : 0)}%`, background: `linear-gradient(90deg,${row.color}55,${row.color})`, transition: "width .7s ease" }} />
            </div>
          </div>
        ))}
      </div>
      {p.abandonedInPeriod > 0 && <div className="mono" style={{ marginTop: 10, padding: "6px 10px", background: "rgba(155,58,58,.06)", border: "1px solid rgba(155,58,58,.2)", borderRadius: 4, fontSize: 8, color: S.textDim }}>Abandoned in period: <span style={{ color: "#e07070" }}>{p.abandonedInPeriod}</span></div>}
    </>
  );
}

// ── Section 02: Pipeline Snapshot ──
function Pipeline({ m }: { m: M }) {
  const s = m.snapshot; const r = m.rates;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        <KPI label="Total Pipeline" val={s.pipeline}     sub="Qualified + future due to call" />
        <KPI label="Booked"         val={s.booked}       sub="Upcoming web meetings" accent={S.amber} />
        <KPI label="Warm"           val={s.warm}         sub="Post-meeting, slow close" accent={S.amber} />
        <KPI label="Special Offer"  val={s.specialOffer} sub="Post-meeting, fast close" accent={S.purple} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 6, padding: 12 }}>
          <div className="mono" style={{ fontSize: 8, color: S.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Funnel Rates (all time)</div>
          <Row label="Qualification rate"      val={`${r.qualificationRate}%`} />
          <Row label="Pipeline → web meeting"  val={`${r.meetingBookingRate}%`} />
          <Row label="Attendance rate"         val={`${r.attendanceRate}%`} />
          <Row label="Special offer rate"      val={`${r.specialOfferRate}%`} note="of attended" />
          <Row label="Warm rate"               val={`${r.warmRate}%`}         note="of attended" />
          <Row label="Post-meeting close"      val={`${r.postMeetingClose}%`} note="excl. abandoned" />
          <Row label="Overall conversion"      val={`${r.overallConversion}%`} />
        </div>
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 6, padding: 12 }}>
          <div className="mono" style={{ fontSize: 8, color: S.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Current State</div>
          <Row label="In cold (to process)"    val={s.cold} />
          <Row label="Qualified pipeline"      val={s.qualified} />
          <Row label="Future due to call"      val={s.futureFromCall} />
          <Row label="No shows (re-engage)"    val={s.noShow} />
          <Row label="Total customers"         val={s.customer} />
          <Row label="Abandoned (all time)"    val={s.abandonedAll} />
          <Row label="Total on board"          val={s.totalOnBoard} />
        </div>
      </div>
    </>
  );
}

// ── Section 03: Outreach ──
function Outreach({ m }: { m: M }) {
  const p = m.period; const r = m.rates; const wa = m.whatsapp;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
      <Card title="Voice Calls — Lucy" dot={S.green}>
        <Big val={p.callsMadeInPeriod} sub="Calls with recordings in period" />
        <Row label="Total calls (all time)" val="see efficiency" />
        <Row label="Call → web meeting" val="see efficiency" />
      </Card>
      <Card title="Pre-Qualification Email" dot={S.green}>
        <Big val={p.presentationsSent} sub="Presentations sent in period" />
        <Row label="Engaged (responded)" val={p.engaged} />
        <Row label="Engagement rate" val={`${r.presentationEngagement}%`} />
      </Card>
      <Card title="WhatsApp Outreach" dot={wa.active ? S.green : S.textMuted}>
        <Big val={wa.active ? wa.messagesSent : null} sub={wa.active ? "Messages sent" : "Not yet active"} />
        <Row label="Leads contacted" val={wa.active ? wa.contacted : "—"} />
        <Row label="Reply rate" val={wa.active ? `${wa.replyRate}%` : "—"} />
      </Card>
    </div>
  );
}
function Card({ title, dot, children }: any) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 6, padding: 12, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${S.green},transparent)`, opacity: .3 }} />
      <div className="mono" style={{ fontSize: 8, color: S.greenDim, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: dot }} />{title}
      </div>
      {children}
    </div>
  );
}
function Big({ val, sub }: { val: number | null; sub: string }) {
  return <>
    <div className="orb" style={{ fontSize: 28, color: val !== null ? S.text : S.textMuted, lineHeight: 1, marginBottom: 2 }}>{val !== null ? val : "—"}</div>
    <div className="mono" style={{ fontSize: 8, color: S.textMuted, marginBottom: 10 }}>{sub}</div>
  </>;
}

// ── Section 04: Efficiency ──
function Efficiency({ m }: { m: M }) {
  const e = m.efficiency;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <KPI label="Avg Calls → Web Meeting" val={e.avgCallsToBookMeeting || "—"} sub={`${e.totalAnsweredCallsPool} leads with calls`} small />
        <KPI label="Avg Calls → Customer"    val={e.avgCallsCustomer    || "—"} sub={`${e.customerPoolSize} customers`} accent={S.greenHi} small />
        <KPI label="Avg Calls (post-meeting)" val={e.avgCallsPostMeeting || "—"} sub={`warm + offer + customer`} accent={S.amber} small />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <KPI label="Avg Emails → Web Meeting" val={e.avgEmailsPostMeeting || "—"} sub={`${e.emailTrackingPoolSize} leads tracked`} small />
        <KPI label="Avg Emails → Customer"    val={e.avgEmailsCustomer    || "—"} sub={`${e.custEmailTrackingPoolSize} customers tracked`} accent={S.greenHi} small />
        <KPI label="Email Tracking"           val={`${e.emailTrackingPoolSize}`} sub="Leads with email data" small />
      </div>
      <div className="mono" style={{ fontSize: 8, color: S.textMuted, padding: "8px 10px", background: S.surface, border: `1px solid ${S.border}`, borderRadius: 4 }}>
        Calls: all post-meeting leads (warm + special offer + customers). Emails: only leads with presentation send date tracked. Customer email pool may be smaller due to older leads pre-dating email automation.
      </div>
    </>
  );
}

// ── Section 05: Abandonment ──
function Abandonment({ m }: { m: M }) {
  const a = m.abandonment;
  const maxCount = a.topReasons[0]?.count || 1;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <KPI label="Total Abandoned"           val={a.total}                sub="All time" accent={S.red} />
        <KPI label="With Reason Recorded"      val={a.withReason}           sub={`${a.noReason} without reason`} />
        <KPI label="Post-Meeting Abandoned"    val={a.postMeetingAbandoned} sub="Had web meeting (recent data)" accent={S.amber} />
      </div>
      {a.topReasons.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div className="mono" style={{ fontSize: 8, color: S.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Top Loss Reasons</div>
          {a.topReasons.map((r, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{r.reason}</span>
                <span className="mono" style={{ fontSize: 9, color: S.greenHi }}>{r.count}</span>
              </div>
              <div style={{ height: 5, background: S.surface2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${Math.round(r.count / maxCount * 100)}%`, background: `linear-gradient(90deg,${S.red}55,${S.red})`, transition: "width .7s ease" }} />
              </div>
            </div>
          ))}
          <div className="mono" style={{ fontSize: 8, color: S.textMuted, marginTop: 4 }}>{a.noReason} leads abandoned without reason recorded</div>
        </div>
      ) : <div className="mono" style={{ fontSize: 10, color: S.textMuted, textAlign: "center", padding: 16 }}>No abandonment reasons recorded</div>}
    </>
  );
}

// ── Section 06: Offers ──
function Offers({ m }: { m: M }) {
  const o = m.offers;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
        <KPI label="Active Offers"       val={o.active}            sub="Awaiting decision" />
        <KPI label="Expiring This Week"  val={o.expiringThisWeek}  sub={o.expiringThisWeek > 0 ? "Action required" : "All clear"} accent={o.expiringThisWeek > 0 ? S.red : S.green} />
        <KPI label="Expiring This Month" val={o.expiringThisMonth} sub="30-day window" accent={S.amber} />
      </div>
      {o.items.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Lead", "Address", "Offer", "Expiry", "Days"].map(h => (
              <th key={h} className="mono" style={{ padding: "5px 10px", textAlign: "left", fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase", color: S.textMuted, fontWeight: 400, borderBottom: `1px solid ${S.border}` }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {o.items.map(item => {
              const urg = item.daysLeft !== null && item.daysLeft <= 7;
              const soon = item.daysLeft !== null && item.daysLeft <= 30;
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(93,129,86,.05)" }}>
                  <td className="mono" style={{ padding: "7px 10px", fontSize: 10, color: S.text }}>{item.name}</td>
                  <td className="mono" style={{ padding: "7px 10px", fontSize: 9, color: S.textDim }}>{item.address || "—"}</td>
                  <td className="mono" style={{ padding: "7px 10px", fontSize: 9, color: S.textDim }}>{item.offerType || "—"}</td>
                  <td className="mono" style={{ padding: "7px 10px", fontSize: 9, color: urg ? "#e07070" : soon ? S.amber : S.textDim }}>{item.expiry || "—"}</td>
                  <td className="mono" style={{ padding: "7px 10px", fontSize: 9, fontWeight: 500, color: urg ? "#e07070" : soon ? S.amber : S.textDim }}>{item.daysLeft !== null ? `${item.daysLeft}d` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : <div className="mono" style={{ fontSize: 10, color: S.textMuted, textAlign: "center", padding: 14 }}>No active special offers</div>}
    </>
  );
}

// ── Section 07: JARVIS Query ──
function Query({ m }: { m: M }) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sales/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metrics: m }) })
      .then(r => r.json()).then(d => { if (d.summary) setAuto(d.summary); }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (text?: string) => {
    const question = text || q.trim();
    if (!question) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sales/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metrics: m, question }) });
      const d = await res.json();
      setAns(d.summary || "No response.");
      setQ("");
    } catch {
      setAns("Error reaching JARVIS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "rgba(93,129,86,.04)", border: "1px solid rgba(93,129,86,.25)", borderRadius: 6, padding: 14 }}>
      <div className="mono" style={{ fontSize: 8, letterSpacing: "0.1em", color: S.greenHi, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: S.green, animation: "pulse 2s ease infinite" }} />
        JARVIS — say your question or type below
      </div>
      {(ans || auto) && <p style={{ fontSize: 12, color: ans ? S.text : S.textDim, lineHeight: 1.65, marginBottom: 12, fontWeight: 300 }}>{ans || auto}</p>}
      <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") ask(); }}
          placeholder={`e.g. "if all ${m.snapshot.specialOffer} special offer leads sign, what is my conversion rate?"`}
          style={{ flex: 1, background: S.surface, border: "1px solid rgba(93,129,86,.3)", borderRadius: 4, color: S.text, padding: "6px 10px", fontSize: 11, fontFamily: "Rajdhani, sans-serif", outline: "none" }}
        />
        <button onClick={() => ask()} disabled={loading || !q.trim()} className="mono" style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid rgba(93,129,86,.4)", background: loading ? "transparent" : "rgba(93,129,86,.15)", color: S.greenHi, cursor: loading ? "default" : "pointer", fontSize: 8, letterSpacing: "0.08em" }}>
          {loading ? "THINKING..." : "ASK"}
        </button>
      </div>
      <div className="mono" style={{ fontSize: 7, color: S.textMuted, marginTop: 6 }}>Voice questions spoken while this view is open are automatically sent here. Answers come through JARVIS voice.</div>
    </div>
  );
}
