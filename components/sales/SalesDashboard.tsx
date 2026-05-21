// components/sales/SalesDashboard.tsx
// Inline component — mounted inside the main Jarvis shell like LucyView.
// No router, no full-page layout, no own voice. Main Jarvis voice handles
// navigation. The JARVIS query panel sends to /api/sales/summary.
"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const S = {
  bg: "#080c09",
  surface: "#0e1410",
  surface2: "#131a14",
  border: "rgba(93,129,86,0.15)",
  borderHi: "rgba(93,129,86,0.4)",
  green: "#5d8156",
  greenDim: "#3d5738",
  greenHi: "#7aa872",
  greenPale: "rgba(93,129,86,0.08)",
  amber: "#c8922a",
  red: "#9b3a3a",
  blue: "#3a6b9b",
  purple: "#9d50dd",
  text: "#e8ede7",
  textDim: "#7a8f79",
  textMuted: "#3d4e3c",
};

interface Metrics {
  period: {
    totalLeads: number;
    webMeetingsSat: number;
    webMeetingsMissed: number;
    webMeetingsUpcoming: number;
    totalWebMeetings: number;
    customersWon: number;
    abandonedInPeriod: number;
    presentationsSent: number;
    presentationsViewed: number;
    callsMade: number;
  };
  snapshot: {
    qualified: number; future: number; booked: number; noShow: number;
    warm: number; specialOffer: number; customer: number; abandoned: number;
  };
  rates: {
    webMeetingRate: number; attendanceRate: number; customerRate: number;
    presentationEngagement: number; postMeetingClose: number;
  };
  offers: {
    active: number; expiringThisWeek: number; expiringThisMonth: number;
    items: { id: string; name: string; profile: string; offerType: string; expiry: string; daysLeft: number | null; address: string }[];
  };
  whatsapp: { messagesSent: number; contacted: number; replies: number; replyRate: number; active: boolean };
  dateRange: { from: string | null; to: string | null; filtered: boolean };
}

export function SalesDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<"week" | "month" | "year" | "custom">("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [focusedChunk, setFocusedChunk] = useState("funnel");

  const getRange = useCallback(() => {
    const now = new Date();
    if (preset === "week")  { const f = new Date(now); f.setDate(f.getDate() - 7);   return { from: f.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }; }
    if (preset === "month") { const f = new Date(now); f.setDate(f.getDate() - 30);  return { from: f.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }; }
    if (preset === "year")  { const f = new Date(now); f.setFullYear(f.getFullYear() - 1); return { from: f.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }; }
    if (customFrom && customTo) return { from: customFrom, to: customTo };
    return { from: null, to: null };
  }, [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = getRange();
      const p = new URLSearchParams();
      if (r.from) p.set("from", r.from);
      if (r.to) p.set("to", r.to);
      const res = await fetch(`/api/sales?${p}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setMetrics(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [getRange]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ width: "100%", fontFamily: "Rajdhani, sans-serif", color: S.text }}>
      {/* Sub-header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: S.textDim }}>SALES INTELLIGENCE</span>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: loading ? S.amber : error ? S.red : "#4ade80", animation: loading ? "pulse 1.5s ease infinite" : "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DatePicker preset={preset} onPreset={setPreset} from={customFrom} to={customTo} onFrom={setCustomFrom} onTo={setCustomTo} />
          <button onClick={load} className="mono" style={{ fontSize: 9, background: S.surface, border: `1px solid ${S.border}`, color: S.textDim, padding: "3px 10px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.08em" }}>REFRESH</button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <div className="mono" style={{ color: S.red, marginBottom: 12 }}>{error}</div>
          <button onClick={load} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.greenHi, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 9 }}>RETRY</button>
        </div>
      ) : (
        <div style={{ padding: "0 0 40px" }}>
          {/* ── PERIOD FUNNEL ── */}
          <Section id="funnel" index="01" label="Sales Funnel" sub={`Leads added in selected period and their outcomes`} focused={focusedChunk === "funnel"} onClick={() => setFocusedChunk("funnel")} loading={loading}>
            {metrics && <PeriodFunnel m={metrics} />}
          </Section>

          <Div label="Live Pipeline" />

          {/* ── LIVE SNAPSHOT ── */}
          <Section id="pipeline" index="02" label="Pipeline Snapshot" sub="Current state of all leads regardless of period" focused={focusedChunk === "pipeline"} onClick={() => setFocusedChunk("pipeline")} loading={loading}>
            {metrics && <LiveSnapshot m={metrics} />}
          </Section>

          <Div label="Outreach Activity" />

          {/* ── OUTREACH ── */}
          <Section id="outreach" index="03" label="Outreach" sub="Activity within selected period" focused={focusedChunk === "outreach"} onClick={() => setFocusedChunk("outreach")} loading={loading}>
            {metrics && <OutreachPanel m={metrics} />}
          </Section>

          <Div label="Offer Management" />

          {/* ── OFFERS ── */}
          <Section id="offers" index="04" label="Special Offers" sub="Active offers and expiry" focused={focusedChunk === "offers"} onClick={() => setFocusedChunk("offers")} loading={loading}>
            {metrics && <OffersPanel m={metrics} />}
          </Section>

          <Div label="JARVIS Analysis" />

          {/* ── JARVIS QUERY ── */}
          <Section id="query" index="05" label="Ask JARVIS" sub="Hypotheticals and funnel analysis — type or speak" focused={focusedChunk === "query"} onClick={() => setFocusedChunk("query")} loading={false}>
            {metrics && <QueryPanel metrics={metrics} />}
          </Section>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ id, index, label, sub, focused, onClick, loading, children }: any) {
  return (
    <div onClick={onClick} style={{ borderBottom: `1px solid ${S.border}`, padding: "20px 20px", cursor: "default", background: focused ? "rgba(93,129,86,0.03)" : "transparent", borderLeft: focused ? `2px solid ${S.green}` : "2px solid transparent", animation: "fadeUp .3s ease both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{ fontSize: 9, color: S.textMuted }}>{index} /</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase" }}>{label}</span>
          <span className="mono" style={{ fontSize: 9, color: S.textMuted }}>{sub}</span>
        </div>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: loading ? S.amber : S.green, animation: loading ? "pulse 1.5s ease infinite" : "none" }} />
      </div>
      {loading && id !== "query" ? <Skel /> : children}
    </div>
  );
}

function Skel() {
  return <div style={{ display: "flex", gap: 10 }}>{[1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: 70, borderRadius: 6, background: S.surface, animation: "pulse 1.5s ease infinite" }} />)}</div>;
}

function Div({ label }: any) {
  return <div className="mono" style={{ fontSize: 8, color: S.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 20px", background: S.surface, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 10 }}>{label}<div style={{ flex: 1, height: 1, background: S.border }} /></div>;
}

function KPI({ label, val, sub, accent }: any) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 7, padding: "12px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent || S.green, opacity: .6 }} />
      <div className="mono" style={{ fontSize: 8, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div className="orb" style={{ fontSize: 24, color: S.text, lineHeight: 1, marginBottom: 3 }}>{val}</div>
      {sub && <div className="mono" style={{ fontSize: 8, color: S.textMuted }}>{sub}</div>}
    </div>
  );
}

/* ── Date Picker ── */
function DatePicker({ preset, onPreset, from, to, onFrom, onTo }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 2, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 5, padding: 2 }}>
        {(["week", "month", "year", "custom"] as const).map(p => (
          <button key={p} onClick={(e) => { e.stopPropagation(); onPreset(p); }} className="mono" style={{ padding: "2px 8px", borderRadius: 3, border: "none", cursor: "pointer", fontSize: 8, letterSpacing: "0.06em", background: preset === p ? S.greenPale : "transparent", color: preset === p ? S.greenHi : S.textDim }}>{p.toUpperCase()}</button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          <input type="date" value={from} onChange={e => onFrom(e.target.value)} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 3, color: S.textDim, padding: "1px 5px", fontSize: 8 }} />
          <ArrowRight size={8} color={S.textMuted} />
          <input type="date" value={to} onChange={e => onTo(e.target.value)} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 3, color: S.textDim, padding: "1px 5px", fontSize: 8 }} />
        </div>
      )}
    </div>
  );
}

/* ── Section 01: Period Funnel ── */
function PeriodFunnel({ m }: { m: Metrics }) {
  const p = m.period;
  const r = m.rates;
  const funnelRows = [
    { label: "Total Leads Added",          val: p.totalLeads,         pct: 100,                                                                                  color: S.green,   note: null as string | null },
    { label: "Presentations Sent",         val: p.presentationsSent,  pct: p.totalLeads > 0 ? Math.round(p.presentationsSent / p.totalLeads * 100) : 0,           color: S.greenHi, note: null as string | null },
    { label: "Presentations Viewed",       val: p.presentationsViewed, pct: p.presentationsSent > 0 ? r.presentationEngagement : 0,                              color: S.blue,    note: `${r.presentationEngagement}% engagement` },
    { label: "Web Meetings (sat)",         val: p.webMeetingsSat,     pct: p.totalLeads > 0 ? Math.round(p.webMeetingsSat / p.totalLeads * 100) : 0,             color: S.amber,   note: null as string | null },
    { label: "Web Meetings (missed/no show)", val: p.webMeetingsMissed, pct: p.totalLeads > 0 ? Math.round(p.webMeetingsMissed / p.totalLeads * 100) : 0,         color: S.red,     note: "drop-off", dimmed: true },
    { label: "Web Meetings (upcoming/booked)", val: p.webMeetingsUpcoming, pct: p.totalLeads > 0 ? Math.round(p.webMeetingsUpcoming / p.totalLeads * 100) : 0,    color: S.amber,   note: "not yet sat" },
    { label: "Customers Won",              val: p.customersWon,       pct: p.totalLeads > 0 ? Math.round(p.customersWon / p.totalLeads * 100) : 0,               color: S.green,   note: `${r.customerRate}% conversion` },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 18 }}>
        <KPI label="Total Leads"     val={p.totalLeads}       sub="Added in period" />
        <KPI label="Web Meetings"    val={p.totalWebMeetings} sub="Sat + missed + booked" accent={S.amber} />
        <KPI label="Attendance"      val={`${r.attendanceRate}%`} sub="Of meetings that ran" />
        <KPI label="Customers Won"   val={p.customersWon}     sub={`${r.customerRate}% of leads`} accent={S.greenHi} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {funnelRows.map((row, i) => (
          <div key={i} style={{ opacity: (row as any).dimmed ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(row as any).dimmed && <span style={{ color: S.red, fontSize: 9 }}>▼</span>}
                <span className="mono" style={{ fontSize: 9, color: (row as any).dimmed ? S.textMuted : S.textDim }}>{row.label}</span>
                {row.note && <span className="mono" style={{ fontSize: 8, color: S.textMuted, background: S.surface2, padding: "1px 5px", borderRadius: 3 }}>{row.note}</span>}
              </div>
              <span className="mono" style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}>{row.val}</span>
            </div>
            <div style={{ height: 6, background: S.surface2, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${Math.max(row.pct, row.val > 0 ? 1 : 0)}%`, background: `linear-gradient(90deg,${row.color}66,${row.color})`, transition: "width .8s ease" }} />
            </div>
          </div>
        ))}
      </div>
      {p.abandonedInPeriod > 0 && (
        <div className="mono" style={{ marginTop: 12, padding: "7px 10px", background: "rgba(155,58,58,.06)", border: "1px solid rgba(155,58,58,.2)", borderRadius: 5, fontSize: 8, color: S.textDim }}>
          Abandoned in period: <span style={{ color: "#e07070" }}>{p.abandonedInPeriod}</span>
        </div>
      )}
    </>
  );
}

/* ── Section 02: Live Snapshot ── */
function LiveSnapshot({ m }: { m: Metrics }) {
  const s = m.snapshot;
  const r = m.rates;
  const rows = [
    { label: "Qualified (active pipeline)",       val: s.qualified,    color: S.green },
    { label: "Web meeting booked (upcoming)",     val: s.booked,       color: S.amber },
    { label: "No shows (to re-engage)",           val: s.noShow,       color: S.red },
    { label: "Warm (attended, converting)",       val: s.warm,         color: S.amber },
    { label: "Special offer applied",             val: s.specialOffer, color: S.purple },
    { label: "Total customers (all time)",        val: s.customer,     color: S.greenHi },
    { label: "Future / nurture",                  val: s.future,       color: S.blue },
    { label: "Abandoned (all time)",              val: s.abandoned,    color: S.textMuted },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Currently Warm"    val={s.warm}                  sub="Need converting" accent={S.amber} />
        <KPI label="Special Offer"     val={s.specialOffer}          sub="Offer made"      accent={S.purple} />
        <KPI label="Post-Meeting Close" val={`${r.postMeetingClose}%`} sub="Warm+offer→customer" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${S.border}` }}>
            <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{row.label}</span>
            <span className="orb" style={{ fontSize: 16, color: row.color }}>{row.val}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Section 03: Outreach ── */
function OutreachPanel({ m }: { m: Metrics }) {
  const p = m.period;
  const r = m.rates;
  const wa = m.whatsapp;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
      {/* Calls */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 7, padding: 14 }}>
        <div className="mono" style={{ fontSize: 8, color: S.greenDim, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: S.green }} />VOICE CALLS — LUCY
        </div>
        <div className="orb" style={{ fontSize: 28, color: S.text, lineHeight: 1, marginBottom: 3 }}>{p.callsMade}</div>
        <div className="mono" style={{ fontSize: 8, color: S.textMuted, marginBottom: 12 }}>Calls with recordings in period</div>
        <Row label="Answer rate" val="—" />
        <Row label="Call → web meeting" val="—" />
      </div>
      {/* Email */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 7, padding: 14 }}>
        <div className="mono" style={{ fontSize: 8, color: S.greenDim, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: S.green }} />PRE-QUALIFICATION EMAIL
        </div>
        <div className="orb" style={{ fontSize: 28, color: S.text, lineHeight: 1, marginBottom: 3 }}>{p.presentationsSent}</div>
        <div className="mono" style={{ fontSize: 8, color: S.textMuted, marginBottom: 12 }}>Presentations sent in period</div>
        <Row label="Viewed" val={String(p.presentationsViewed)} />
        <Row label="Engagement rate" val={`${r.presentationEngagement}%`} />
      </div>
      {/* WhatsApp */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 7, padding: 14 }}>
        <div className="mono" style={{ fontSize: 8, color: wa.active ? S.greenDim : S.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: wa.active ? S.green : S.textMuted }} />WHATSAPP OUTREACH
        </div>
        <div className="orb" style={{ fontSize: 28, color: wa.active ? S.text : S.textMuted, lineHeight: 1, marginBottom: 3 }}>{wa.active ? wa.messagesSent : "—"}</div>
        <div className="mono" style={{ fontSize: 8, color: S.textMuted, marginBottom: 12 }}>{wa.active ? "Messages sent" : "Not yet active"}</div>
        <Row label="Reply rate" val={wa.active ? `${wa.replyRate}%` : null} />
        <Row label="WhatsApp → meeting" val={null} />
      </div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: `1px solid ${S.border}` }}>
      <span className="mono" style={{ fontSize: 8, color: S.textDim }}>{label}</span>
      {val !== null
        ? <span className="mono" style={{ fontSize: 9, color: S.greenHi, fontWeight: 500 }}>{val}</span>
        : <span className="mono" style={{ fontSize: 8, color: S.textMuted, background: S.surface2, border: `1px dashed ${S.textMuted}`, borderRadius: 3, padding: "0 5px", opacity: .6 }}>coming soon</span>
      }
    </div>
  );
}

/* ── Section 04: Offers ── */
function OffersPanel({ m }: { m: Metrics }) {
  const o = m.offers;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <KPI label="Active Offers"        val={o.active}            sub="Awaiting decision" />
        <KPI label="Expiring This Week"   val={o.expiringThisWeek}  sub={o.expiringThisWeek > 0 ? "Action required" : "All clear"} accent={o.expiringThisWeek > 0 ? S.red : S.green} />
        <KPI label="Expiring This Month"  val={o.expiringThisMonth} sub="Total expiring 30d" accent={S.amber} />
      </div>
      {o.items.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Lead", "Address", "Offer", "Expiry", "Days Left"].map(h => (
              <th key={h} className="mono" style={{ padding: "6px 10px", textAlign: "left", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: S.textMuted, fontWeight: 400, borderBottom: `1px solid ${S.border}` }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {o.items.map(item => {
              const urg = item.daysLeft !== null && item.daysLeft <= 7;
              const soon = item.daysLeft !== null && item.daysLeft <= 30;
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(93,129,86,.06)" }}>
                  <td className="mono" style={{ padding: "8px 10px", fontSize: 10, color: S.text }}>{item.name}</td>
                  <td className="mono" style={{ padding: "8px 10px", fontSize: 9, color: S.textDim }}>{item.address || "—"}</td>
                  <td className="mono" style={{ padding: "8px 10px", fontSize: 9, color: S.textDim }}>{item.offerType || "—"}</td>
                  <td className="mono" style={{ padding: "8px 10px", fontSize: 9, color: urg ? "#e07070" : soon ? S.amber : S.textDim }}>{item.expiry || "—"}</td>
                  <td className="mono" style={{ padding: "8px 10px", fontSize: 9, fontWeight: 500, color: urg ? "#e07070" : soon ? S.amber : S.textDim }}>{item.daysLeft !== null ? `${item.daysLeft}d` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="mono" style={{ fontSize: 10, color: S.textMuted, textAlign: "center", padding: 16 }}>No active special offers</div>
      )}
    </>
  );
}

/* ── Section 05: JARVIS Query Panel ── */
function QueryPanel({ metrics }: { metrics: Metrics }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoSummary, setAutoSummary] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sales/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics }),
    }).then(r => r.json()).then(d => {
      if (d.summary) setAutoSummary(d.summary);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (text?: string) => {
    const q = text || query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sales/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics, question: q }),
      });
      const d = await res.json();
      setAnswer(d.summary || "No response.");
      setQuery("");
    } catch {
      setAnswer("Error reaching JARVIS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "rgba(93,129,86,.04)", border: "1px solid rgba(93,129,86,.25)", borderRadius: 8, padding: 16 }}>
      <div className="mono" style={{ fontSize: 8, letterSpacing: "0.12em", color: S.greenHi, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: S.green, animation: "pulse 2s ease infinite" }} />
        JARVIS — say your question aloud or type below
      </div>
      {(answer || autoSummary) && (
        <p style={{ fontSize: 12, color: answer ? S.text : S.textDim, lineHeight: 1.65, marginBottom: 14, fontWeight: 300 }}>{answer || autoSummary}</p>
      )}
      <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") ask(); }}
          placeholder={`e.g. "if all ${metrics.snapshot.specialOffer} special offer leads sign, what is my conversion rate?"`}
          style={{ flex: 1, background: S.surface, border: "1px solid rgba(93,129,86,.3)", borderRadius: 5, color: S.text, padding: "7px 10px", fontSize: 11, fontFamily: "Rajdhani, sans-serif", outline: "none" }}
        />
        <button onClick={() => ask()} disabled={loading || !query.trim()} className="mono" style={{ padding: "7px 14px", borderRadius: 5, border: "1px solid rgba(93,129,86,.4)", background: loading ? "transparent" : "rgba(93,129,86,.15)", color: S.greenHi, cursor: loading ? "default" : "pointer", fontSize: 8, letterSpacing: "0.1em" }}>
          {loading ? "THINKING..." : "ASK"}
        </button>
      </div>
      <div className="mono" style={{ fontSize: 8, color: S.textMuted, marginTop: 8 }}>
        When you speak to JARVIS while this view is open, your question is automatically sent here. Voice answers come through JARVIS.
      </div>
    </div>
  );
}
