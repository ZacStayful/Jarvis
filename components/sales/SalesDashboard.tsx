// components/sales/SalesDashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { C } from "@/lib/jarvis-design";

/* ─── Palette ─── */
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
  text: "#e8ede7",
  textDim: "#7a8f79",
  textMuted: "#3d4e3c",
};

/* ─── Types ─── */
interface SalesMetrics {
  funnel: {
    cold: number;
    qualified: number;
    future: number;
    futureFromCall: number;
    futureGeneral: number;
    abandonedFromCall: number;
    abandonedGeneral: number;
    webMeetingBooked: number;
    noShow: number;
    warm: number;
    specialOffer: number;
    customer: number;
    totalPipeline: number;
    totalLeads: number;
  };
  rates: {
    qualifiedToMeetingRate: number;
    attendanceRate: number;
    postMeetingConversion: number;
    coldToCustomer: number;
    engagementRate: number;
  };
  outreach: {
    callsMade: number;
    presentationEmailSent: number;
    presentationViewed: number;
    waMessagesSent: number;
    waReplies: number;
    waContacted: number;
    waReplyRate: number;
    waActive: boolean;
  };
  offers: {
    active: number;
    expiringThisWeek: number;
    expiringThisMonth: number;
    items: { id: string; name: string; profile: string; offerType: string; expiry: string; daysLeft: number | null; address: string }[];
  };
  dateRange: { from: string | null; to: string | null; filtered: boolean };
}

/* ─── Main ─── */
export function SalesDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedChunk, setFocusedChunk] = useState<string>("funnel");
  const [preset, setPreset] = useState<"week" | "month" | "year" | "custom">("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const getDateRange = useCallback(() => {
    const now = new Date();
    if (preset === "week") {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
    }
    if (preset === "month") {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
    }
    if (preset === "year") {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      return { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
    }
    if (customFrom && customTo) return { from: customFrom, to: customTo };
    return { from: null, to: null };
  }, [preset, customFrom, customTo]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = getDateRange();
      const params = new URLSearchParams();
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      const res = await fetch(`/api/sales?${params}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "Rajdhani, sans-serif" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,12,9,0.92)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${S.border}`,
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", color: S.green, display: "flex", alignItems: "center" }}>
            <ChevronLeft size={16} />
          </button>
          <span className="orb" style={{ fontSize: 12, letterSpacing: "0.22em", color: S.greenHi }}>JARVIS</span>
          <span style={{ width: 1, height: 14, background: S.border }} />
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: S.textDim }}>SALES INTELLIGENCE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DateRangePicker preset={preset} onPreset={setPreset} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? S.amber : error ? S.red : "#4ade80", animation: loading ? "pulse 1.5s ease infinite" : "none" }} />
            <span className="mono" style={{ fontSize: 9, color: S.textDim, letterSpacing: "0.08em" }}>{loading ? "LOADING" : error ? "ERROR" : "LIVE"}</span>
          </div>
        </div>
      </header>

      <main>
        {error && !metrics ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="mono" style={{ color: S.red, fontSize: 12, marginBottom: 12 }}>{error}</div>
            <button onClick={fetchMetrics} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.greenHi, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 10, letterSpacing: "0.1em" }}>RETRY</button>
          </div>
        ) : (
          <>
            <Chunk id="funnel" index="01" name="Sales Funnel" focused={focusedChunk === "funnel"} onClick={() => setFocusedChunk("funnel")} loading={loading}>
              {metrics && <SalesFunnel m={metrics} />}
            </Chunk>
            <Divider label="Outreach Channels" />
            <Chunk id="outreach" index="02" name="Outreach Activity" focused={focusedChunk === "outreach"} onClick={() => setFocusedChunk("outreach")} loading={loading}>
              {metrics && <OutreachMetrics m={metrics} />}
            </Chunk>
            <Divider label="Post-Meeting Conversion" />
            <Chunk id="meetings" index="03" name="Web Meeting Performance" focused={focusedChunk === "meetings"} onClick={() => setFocusedChunk("meetings")} loading={loading}>
              {metrics && <WebMeetingMetrics m={metrics} />}
            </Chunk>
            <Divider label="Offer Management" />
            <Chunk id="offers" index="04" name="Special Offers" focused={focusedChunk === "offers"} onClick={() => setFocusedChunk("offers")} loading={loading}>
              {metrics && <SpecialOffers m={metrics} />}
            </Chunk>
          </>
        )}
      </main>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─── Date Range Picker ─── */
function DateRangePicker({ preset, onPreset, customFrom, customTo, onCustomFrom, onCustomTo }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 2, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 6, padding: 3 }}>
        {(["week","month","year","custom"] as const).map(p => (
          <button key={p} onClick={() => onPreset(p)} className="mono" style={{ padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.08em", background: preset === p ? S.greenPale : "transparent", color: preset === p ? S.greenHi : S.textDim }}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="date" value={customFrom} onChange={e => onCustomFrom(e.target.value)} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 4, color: S.textDim, padding: "2px 6px", fontSize: 9 }} />
          <ArrowRight size={10} color={S.textMuted} />
          <input type="date" value={customTo} onChange={e => onCustomTo(e.target.value)} className="mono" style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 4, color: S.textDim, padding: "2px 6px", fontSize: 9 }} />
        </div>
      )}
    </div>
  );
}

/* ─── Chunk Wrapper ─── */
function Chunk({ id, index, name, focused, onClick, loading, children }: any) {
  const cmds: Record<string, string> = { funnel: '"show pipeline"', outreach: '"show outreach"', meetings: '"show meetings"', offers: '"show offers"' };
  return (
    <div onClick={onClick} style={{ borderBottom: `1px solid ${S.border}`, padding: "24px 28px", cursor: "default", position: "relative", background: focused ? "rgba(93,129,86,0.04)" : "transparent", borderLeft: focused ? `2px solid ${S.green}` : "2px solid transparent", animation: "fadeUp 0.4s ease both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ fontSize: 9, color: S.textMuted, letterSpacing: "0.1em" }}>{index} /</span>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: S.textDim, textTransform: "uppercase" }}>{name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{ fontSize: 8, color: S.greenDim, letterSpacing: "0.06em", background: S.greenPale, border: `1px solid ${S.border}`, borderRadius: 4, padding: "2px 7px", opacity: focused ? 1 : 0, transition: "opacity 0.2s" }}>{cmds[id]}</span>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? S.amber : S.green, animation: loading ? "pulse 1.5s ease infinite" : "none" }} />
        </div>
      </div>
      {focused && (
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(93,129,86,0.06)", border: `1px solid ${S.borderHi}`, borderRadius: 6, fontSize: 9, color: S.greenHi, letterSpacing: "0.06em", marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.green, animation: "pulse 2s ease infinite" }} />
          JARVIS focused — say &quot;summarise&quot; for AI briefing
        </div>
      )}
      {loading ? <Skeleton /> : children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="mono" style={{ fontSize: 9, color: S.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 28px", background: S.surface, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12 }}>
      {label}<div style={{ flex: 1, height: 1, background: S.border }} />
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ flex: 1, height: 80, borderRadius: 8, background: S.surface, border: `1px solid ${S.border}`, animation: "pulse 1.5s ease infinite" }} />
      ))}
    </div>
  );
}

function KPI({ label, value, sub, accent }: any) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent || S.green, opacity: 0.6 }} />
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: S.textDim, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div className="orb" style={{ fontSize: 26, color: S.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 9, color: S.textMuted }}>{sub}</div>}
    </div>
  );
}

/* ─── Chunk 01: Sales Funnel ─── */
function SalesFunnel({ m }: { m: SalesMetrics }) {
  const f = m.funnel;
  const r = m.rates;

  // The funnel stages in order — each shows absolute count and % of the step above
  const stages = [
    { label: "Cold Leads",         sub: "New leads added",                value: f.cold,              color: S.green,    barWidth: 100 },
    { label: "Qualified",          sub: "Entered pipeline",                value: f.qualified,         color: S.greenHi,  barWidth: f.cold > 0 ? Math.round((f.qualified / Math.max(f.cold, f.totalPipeline)) * 100) : 0 },
    { label: "In the Future",      sub: "Too early (from call + general)", value: f.future,            color: S.blue,     barWidth: f.totalPipeline > 0 ? Math.round((f.future / f.totalPipeline) * 100) : 0, dimmed: true },
    { label: "Abandoned at Call",  sub: "Dropped during outreach",         value: f.abandonedFromCall, color: S.red,      barWidth: f.totalPipeline > 0 ? Math.round((f.abandonedFromCall / f.totalPipeline) * 100) : 0, dimmed: true },
    { label: "Web Meeting Booked", sub: "Calendly booking confirmed",      value: f.webMeetingBooked,  color: S.amber,    barWidth: f.totalPipeline > 0 ? Math.round(((f.webMeetingBooked + f.noShow + f.warm + f.specialOffer) / f.totalPipeline) * 100) : 0 },
    { label: "No Show",            sub: "Missed the meeting",              value: f.noShow,            color: S.red,      barWidth: (f.webMeetingBooked + f.noShow) > 0 ? Math.round((f.noShow / (f.webMeetingBooked + f.noShow + f.warm + f.specialOffer)) * 100) : 0, dimmed: true },
    { label: "Warm (Attended)",    sub: "Meeting sat, converting",         value: f.warm,              color: "#e8a84a",  barWidth: (f.warm + f.specialOffer + f.customer) > 0 ? Math.round((f.warm / (f.warm + f.specialOffer + f.customer)) * 100) : 0 },
    { label: "Special Offer Applied", sub: "Offer made to lead",           value: f.specialOffer,      color: "#9d50dd",  barWidth: (f.warm + f.specialOffer + f.customer) > 0 ? Math.round((f.specialOffer / (f.warm + f.specialOffer + f.customer)) * 100) : 0 },
    { label: "Customer / Signed",  sub: "Converted successfully",          value: f.customer,          color: S.green,    barWidth: (f.warm + f.specialOffer + f.customer) > 0 ? Math.round((f.customer / (f.warm + f.specialOffer + f.customer)) * 100) : 0 },
  ];

  return (
    <>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        <KPI label="Cold Leads" value={f.cold} sub="In pipeline" />
        <KPI label="Qualified" value={f.qualified} sub="Active pipeline" />
        <KPI label="Web Meetings" value={f.webMeetingBooked + f.noShow + f.warm + f.specialOffer} sub="Total booked" accent={S.amber} />
        <KPI label="Customers" value={f.customer} sub="Total converted" accent={S.greenHi} />
        <KPI label="Post-Meeting Close" value={`${r.postMeetingConversion}%`} sub="Warm + offer → customer" />
      </div>

      {/* Funnel bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {stages.map((stage, i) => (
          <div key={i} style={{ opacity: stage.dimmed ? 0.75 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {stage.dimmed && <span className="mono" style={{ fontSize: 9, color: S.red }}>▼</span>}
                <span className="mono" style={{ fontSize: 10, color: stage.dimmed ? S.textMuted : S.textDim }}>{stage.label}</span>
                <span className="mono" style={{ fontSize: 9, color: S.textMuted }}>{stage.sub}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: S.greenHi, fontWeight: 500 }}>{stage.value}</span>
            </div>
            <div style={{ height: 8, background: S.surface2, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${Math.max(stage.barWidth, stage.value > 0 ? 2 : 0)}%`, background: `linear-gradient(90deg, ${stage.color}88, ${stage.color})`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Abandoned summary */}
      {f.abandonedGeneral > 0 && (
        <div className="mono" style={{ marginTop: 16, padding: "8px 12px", background: "rgba(155,58,58,0.06)", border: `1px solid rgba(155,58,58,0.2)`, borderRadius: 6, fontSize: 9, color: S.textDim }}>
          Total abandoned (all stages): <span style={{ color: "#e07070" }}>{f.abandonedGeneral + f.abandonedFromCall}</span>
          <span style={{ marginLeft: 16 }}>In the future (nurture): <span style={{ color: S.blue }}>{f.future}</span></span>
        </div>
      )}
    </>
  );
}

/* ─── Chunk 02: Outreach ─── */
function OutreachMetrics({ m }: { m: SalesMetrics }) {
  const o = m.outreach;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      <ChannelCard
        title="Voice Calls — Lucy"
        big={o.callsMade}
        sub="Calls made"
        stats={[
          { label: "Answer rate", value: "—" },
          { label: "Call → web meeting", value: "—" },
        ]}
      />
      <ChannelCard
        title="Pre-Qualification Email"
        big={o.presentationViewed}
        sub={`Presentations viewed (${m.rates.engagementRate}% rate)`}
        stats={[
          { label: "Emails sent", value: String(o.presentationEmailSent) },
          { label: "Engagement rate", value: `${m.rates.engagementRate}%` },
        ]}
      />
      <ChannelCard
        title="WhatsApp Outreach"
        big={o.waActive ? o.waMessagesSent : null}
        sub={o.waActive ? "Messages sent" : "Not yet active"}
        comingSoon={!o.waActive}
        stats={[
          { label: "Reply rate", value: o.waActive ? `${o.waReplyRate}%` : null },
          { label: "WhatsApp → meeting", value: null },
        ]}
      />
    </div>
  );
}

function ChannelCard({ title, big, sub, stats, comingSoon }: any) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`, opacity: 0.4 }} />
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: S.greenDim, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: comingSoon ? S.textMuted : S.green }} />{title}
      </div>
      <div className="orb" style={{ fontSize: 32, color: comingSoon ? S.textMuted : S.text, lineHeight: 1, marginBottom: 3 }}>{big !== null ? big : "—"}</div>
      <div className="mono" style={{ fontSize: 9, color: S.textMuted, marginBottom: 14 }}>{sub}</div>
      {stats.map((s: any, i: number) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${S.border}` }}>
          <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{s.label}</span>
          {s.value !== null ? (
            <span className="mono" style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}>{s.value}</span>
          ) : (
            <span className="mono" style={{ fontSize: 9, color: S.textMuted, background: S.surface2, border: `1px dashed ${S.textMuted}`, borderRadius: 4, padding: "1px 6px", opacity: 0.6 }}>Coming soon</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Chunk 03: Web Meetings ─── */
function WebMeetingMetrics({ m }: { m: SalesMetrics }) {
  const f = m.funnel;
  const r = m.rates;
  const totalBooked = f.webMeetingBooked + f.noShow + f.warm + f.specialOffer;
  const bc = {
    green: { bg: "rgba(93,129,86,0.15)", text: S.greenHi, border: "rgba(93,129,86,0.3)" },
    amber: { bg: "rgba(200,146,42,0.15)", text: S.amber, border: "rgba(200,146,42,0.3)" },
    blue:  { bg: "rgba(58,107,155,0.15)", text: "#70a8e0", border: "rgba(58,107,155,0.3)" },
  };
  const cards = [
    { label: "Total Booked",       value: totalBooked,                                  desc: "All time",                                                                badge: "blue",  badgeText: "All time" },
    { label: "Attendance Rate",    value: `${r.attendanceRate}%`,                       desc: `${f.warm + f.specialOffer + f.customer} attended of ${totalBooked}`,    badge: r.attendanceRate >= 70 ? "green" : "amber",          badgeText: r.attendanceRate >= 70 ? "Good" : "Below target" },
    { label: "No Shows",           value: f.noShow,                                     desc: "Currently in no-show group",                                              badge: f.noShow > 5 ? "amber" : "green",                    badgeText: f.noShow > 5 ? "Action needed" : "Managed" },
    { label: "Post-Meeting Close", value: `${r.postMeetingConversion}%`,                desc: `${f.customer} converted of ${f.warm + f.specialOffer + f.customer}`,    badge: r.postMeetingConversion >= 30 ? "green" : "amber",   badgeText: r.postMeetingConversion >= 30 ? "Strong" : "Focus here" },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        {cards.map((c, i) => {
          const b = bc[c.badge as keyof typeof bc] || bc.green;
          return (
            <div key={i} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 8 }}>{c.label}</div>
              <div className="orb" style={{ fontSize: 24, color: S.text, marginBottom: 3 }}>{c.value}</div>
              <div className="mono" style={{ fontSize: 9, color: S.textMuted, marginBottom: 6 }}>{c.desc}</div>
              <span className="mono" style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: b.bg, color: b.text, border: `1px solid ${b.border}` }}>{c.badgeText}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 10 }}>Post-Meeting Pipeline</div>
          {[
            { label: "Warm leads (converting)", value: f.warm },
            { label: "Special offer applied",   value: f.specialOffer },
            { label: "Customers signed",        value: f.customer },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${S.border}` }}>
              <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{row.label}</span>
              <span className="mono" style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 10 }}>Pipeline Requiring Action</div>
          {[
            { label: "No-shows to re-engage", value: f.noShow },
            { label: "Warm leads to close",   value: f.warm },
            { label: "Future leads to nurture", value: f.future },
            { label: "Abandoned at call",     value: f.abandonedFromCall },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${S.border}` }}>
              <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{row.label}</span>
              <span className="mono" style={{ fontSize: 10, color: row.value > 0 ? S.amber : S.greenHi, fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Chunk 04: Special Offers ─── */
function SpecialOffers({ m }: { m: SalesMetrics }) {
  const o = m.offers;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <KPI label="Active Offers" value={o.active} sub="Awaiting decision" />
        <KPI label="Expiring This Week" value={o.expiringThisWeek} accent={o.expiringThisWeek > 0 ? S.red : S.green} sub={o.expiringThisWeek > 0 ? "Action required" : "All clear"} />
        <KPI label="Expiring This Month" value={o.expiringThisMonth} accent={S.amber} />
        <KPI label="Offer → Customer" value="—" sub="Tracking coming soon" />
      </div>
      {o.items.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Lead", "Address", "Offer Type", "Expiry", "Days Left"].map(h => (
                <th key={h} className="mono" style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: S.textMuted, fontWeight: 500, borderBottom: `1px solid ${S.border}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {o.items.map(item => {
                const urgent = item.daysLeft !== null && item.daysLeft <= 7;
                const soon = item.daysLeft !== null && item.daysLeft <= 30;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid rgba(93,129,86,0.06)` }}>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: S.text }}>{item.name}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: S.textDim }}>{item.address || "—"}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: S.textDim }}>{item.offerType || "—"}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: urgent ? "#e07070" : soon ? S.amber : S.textDim }}>{item.expiry || "—"}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, fontWeight: 500, color: urgent ? "#e07070" : soon ? S.amber : S.textDim }}>
                      {item.daysLeft !== null ? `${item.daysLeft}d` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mono" style={{ fontSize: 11, color: S.textMuted, textAlign: "center", padding: 20 }}>No active special offers</div>
      )}
    </>
  );
}
