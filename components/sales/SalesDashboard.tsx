// components/sales/SalesDashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { C } from "@/lib/jarvis-design";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

interface OfferItem {
  id: string;
  name: string;
  profile: string;
  offerType: string;
  expiry: string;
  daysLeft: number | null;
  status: string;
  address: string;
}

interface SalesMetrics {
  total: number;
  pipeline: {
    cold: number;
    abandoned: number;
    future: number;
    webMeetingBooked: number;
    webMeetingNoShow: number;
    warm: number;
    specialOffer: number;
    customer: number;
    attended: number;
    qualificationDropoff: number;
    futureRate: number;
    attendanceRate: number;
    noShowRate: number;
    postMeetingConversion: number;
    overallConversion: number;
  };
  outreach: {
    callsMade: number;
    emailsEngaged: number;
    emailEngagementRate: number;
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
    items: OfferItem[];
  };
  dateRange: { from: string | null; to: string | null; filtered: boolean };
}

type ChunkId = "pipeline" | "outreach" | "meetings" | "offers";

/* ═══════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════ */

export function SalesDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedChunk, setFocusedChunk] = useState<ChunkId | null>("pipeline");

  // Date range
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
          <button onClick={() => router.push("/")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: S.green, display: "flex", alignItems: "center",
          }}>
            <ChevronLeft size={16} />
          </button>
          <span className="orb" style={{ fontSize: 12, letterSpacing: "0.22em", color: S.greenHi }}>
            JARVIS
          </span>
          <span style={{ width: 1, height: 14, background: S.border }} />
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: S.textDim }}>
            SALES INTELLIGENCE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DateRangePicker
            preset={preset} onPreset={setPreset}
            customFrom={customFrom} customTo={customTo}
            onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: loading ? S.amber : error ? S.red : "#4ade80",
              animation: loading ? "pulse 1.5s ease infinite" : "none",
            }} />
            <span className="mono" style={{ fontSize: 9, color: S.textDim, letterSpacing: "0.08em" }}>
              {loading ? "LOADING" : error ? "ERROR" : "LIVE"}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: 0 }}>
        {error && !metrics ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="mono" style={{ color: S.red, fontSize: 12, marginBottom: 12 }}>{error}</div>
            <button onClick={fetchMetrics} className="mono" style={{
              background: S.surface, border: `1px solid ${S.border}`,
              color: S.greenHi, padding: "6px 16px", borderRadius: 6,
              cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
            }}>RETRY</button>
          </div>
        ) : (
          <>
            <Chunk id="pipeline" index="01" name="Pipeline Overview" focused={focusedChunk === "pipeline"} onClick={() => setFocusedChunk("pipeline")} loading={loading}>
              {metrics && <PipelineFunnel m={metrics} />}
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
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes scanline { 0% { top: -2px } 100% { top: 100% } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Date Range Picker
   ═══════════════════════════════════════════ */

function DateRangePicker({ preset, onPreset, customFrom, customTo, onCustomFrom, onCustomTo }: {
  preset: string;
  onPreset: (p: any) => void;
  customFrom: string; customTo: string;
  onCustomFrom: (v: string) => void; onCustomTo: (v: string) => void;
}) {
  const presets = [
    { key: "week", label: "WEEK" },
    { key: "month", label: "MONTH" },
    { key: "year", label: "YEAR" },
    { key: "custom", label: "CUSTOM" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        display: "flex", gap: 2,
        background: S.surface, border: `1px solid ${S.border}`,
        borderRadius: 6, padding: 3,
      }}>
        {presets.map(p => (
          <button key={p.key} onClick={() => onPreset(p.key)} className="mono" style={{
            padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer",
            fontSize: 9, letterSpacing: "0.08em",
            background: preset === p.key ? S.greenPale : "transparent",
            color: preset === p.key ? S.greenHi : S.textDim,
          }}>{p.label}</button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="date" value={customFrom} onChange={e => onCustomFrom(e.target.value)} className="mono" style={{
            background: S.surface, border: `1px solid ${S.border}`, borderRadius: 4,
            color: S.textDim, padding: "2px 6px", fontSize: 9,
          }} />
          <ArrowRight size={10} color={S.textMuted} />
          <input type="date" value={customTo} onChange={e => onCustomTo(e.target.value)} className="mono" style={{
            background: S.surface, border: `1px solid ${S.border}`, borderRadius: 4,
            color: S.textDim, padding: "2px 6px", fontSize: 9,
          }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Chunk Wrapper
   ═══════════════════════════════════════════ */

function Chunk({ id, index, name, focused, onClick, loading, children }: {
  id: ChunkId; index: string; name: string;
  focused: boolean; onClick: () => void; loading: boolean;
  children: React.ReactNode;
}) {
  const voiceCmds: Record<ChunkId, string> = {
    pipeline: '"focus on pipeline"',
    outreach: '"focus on outreach"',
    meetings: '"focus on meetings"',
    offers: '"show me offers"',
  };
  return (
    <div onClick={onClick} style={{
      borderBottom: `1px solid ${S.border}`,
      padding: "24px 28px",
      cursor: "default", position: "relative",
      background: focused ? "rgba(93,129,86,0.04)" : "transparent",
      borderLeft: focused ? `2px solid ${S.green}` : "2px solid transparent",
      animation: "fadeUp 0.4s ease both",
    }}>
      {focused && (
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, rgba(93,129,86,0.3), transparent)`,
          animation: "scanline 3s linear infinite", pointerEvents: "none",
        }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ fontSize: 9, color: S.textMuted, letterSpacing: "0.1em" }}>{index} /</span>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: S.textDim, textTransform: "uppercase" }}>{name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{
            fontSize: 8, color: S.greenDim, letterSpacing: "0.06em",
            background: S.greenPale, border: `1px solid ${S.border}`, borderRadius: 4,
            padding: "2px 7px", opacity: focused ? 1 : 0, transition: "opacity 0.2s",
          }}>{voiceCmds[id]}</span>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: loading ? S.amber : S.green,
            animation: loading ? "pulse 1.5s ease infinite" : "none",
          }} />
        </div>
      </div>
      {focused && (
        <div className="mono" style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px",
          background: "rgba(93,129,86,0.06)", border: `1px solid ${S.borderHi}`,
          borderRadius: 6, fontSize: 9, color: S.greenHi,
          letterSpacing: "0.06em", marginBottom: 16,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.green, animation: "pulse 2s ease infinite" }} />
          JARVIS focused — say "summarise" for AI briefing
        </div>
      )}
      {loading ? <LoadingSkeleton /> : children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="mono" style={{
      fontSize: 9, color: S.textMuted, letterSpacing: "0.15em", textTransform: "uppercase",
      padding: "7px 28px", background: S.surface,
      borderBottom: `1px solid ${S.border}`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {label}
      <div style={{ flex: 1, height: 1, background: S.border }} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          flex: 1, height: 80, borderRadius: 8,
          background: S.surface, border: `1px solid ${S.border}`,
          animation: "pulse 1.5s ease infinite",
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   KPI Card
   ═══════════════════════════════════════════ */

function KPI({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: S.surface, border: `1px solid ${S.border}`,
      borderRadius: 8, padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent || S.green, opacity: 0.6 }} />
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: S.textDim, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div className="orb" style={{ fontSize: 26, color: S.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 9, color: S.textMuted }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Chunk 01 — Pipeline Funnel
   ═══════════════════════════════════════════ */

function PipelineFunnel({ m }: { m: SalesMetrics }) {
  const p = m.pipeline;
  const funnelSteps = [
    { label: "Cold Leads", value: p.cold, pct: 100, color: S.green },
    { label: "Abandoned", value: p.abandoned, pct: p.qualificationDropoff, color: S.red, dropoff: `${p.qualificationDropoff}% drop-off` },
    { label: "Future (too early)", value: p.future, pct: p.futureRate, color: S.blue },
    { label: "Web Meeting Booked", value: p.webMeetingBooked, pct: m.total > 0 ? Math.round((p.webMeetingBooked / m.total) * 100) : 0, color: S.green },
    { label: "No Show", value: p.webMeetingNoShow, pct: p.noShowRate, color: S.red },
    { label: "Warm / In Progress", value: p.warm + p.specialOffer, pct: m.total > 0 ? Math.round(((p.warm + p.specialOffer) / m.total) * 100) : 0, color: S.amber },
    { label: "Customer", value: p.customer, pct: p.overallConversion, color: S.green },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 18 }}>
        <KPI label="Cold Leads" value={p.cold} sub="This period" />
        <KPI label="Abandoned" value={p.abandoned} sub={`${p.qualificationDropoff}% drop-off`} accent={S.red} />
        <KPI label="Web Meetings" value={p.webMeetingBooked} />
        <KPI label="Customers" value={p.customer} accent={S.greenHi} />
        <KPI label="Cold → Customer" value={`${p.overallConversion}%`} sub="Overall conversion" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {funnelSteps.map((step, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 10, color: S.textDim }}>{step.label}</span>
              <span className="mono" style={{ fontSize: 10, color: S.greenHi }}>
                {step.value} <span style={{ color: S.textMuted, fontSize: 9 }}>({step.pct}%)</span>
              </span>
            </div>
            <div style={{ height: 6, background: S.surface2, borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                width: `${Math.max(step.pct, 2)}%`,
                background: `linear-gradient(90deg, ${step.color}88, ${step.color})`,
                transition: "width 0.6s ease",
              }} />
            </div>
            {step.dropoff && <div className="mono" style={{ fontSize: 9, color: S.red, marginTop: 2 }}>▼ {step.dropoff}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Chunk 02 — Outreach Metrics
   ═══════════════════════════════════════════ */

function OutreachMetrics({ m }: { m: SalesMetrics }) {
  const o = m.outreach;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      <ChannelCard
        icon="Voice Calls — Lucy"
        value={o.callsMade}
        sub="Calls made"
        stats={[
          { label: "Transcripts generated", value: String(o.callsMade) },
          { label: "Call → web meeting", value: "—" },
        ]}
      />
      <ChannelCard
        icon="Pre-Qualification Email"
        value={o.emailsEngaged}
        sub="Leads engaged"
        stats={[
          { label: "Engagement rate", value: `${o.emailEngagementRate}%` },
          { label: "Response → meeting", value: "—" },
        ]}
      />
      <ChannelCard
        icon="WhatsApp Outreach"
        value={o.waActive ? o.waMessagesSent : null}
        sub={o.waActive ? "Messages sent" : "Not yet active"}
        comingSoon={!o.waActive}
        stats={[
          { label: "Messages sent", value: o.waActive ? String(o.waMessagesSent) : null },
          { label: "Reply rate", value: o.waActive ? `${o.waReplyRate}%` : null },
          { label: "WhatsApp → meeting", value: null },
        ]}
      />
    </div>
  );
}

function ChannelCard({ icon, value, sub, stats, comingSoon }: {
  icon: string; value: number | null; sub: string;
  stats: { label: string; value: string | null }[];
  comingSoon?: boolean;
}) {
  return (
    <div style={{
      background: S.surface, border: `1px solid ${S.border}`,
      borderRadius: 8, padding: 16,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
        opacity: 0.4,
      }} />
      <div className="mono" style={{
        fontSize: 9, letterSpacing: "0.12em", color: S.greenDim,
        marginBottom: 12, display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: comingSoon ? S.textMuted : S.green }} />
        {icon}
      </div>
      <div className="orb" style={{ fontSize: 32, color: comingSoon ? S.textMuted : S.text, lineHeight: 1, marginBottom: 3 }}>
        {value !== null ? value : "—"}
      </div>
      <div className="mono" style={{ fontSize: 9, color: S.textMuted, marginBottom: 14 }}>{sub}</div>
      {stats.map((s, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between",
          padding: "5px 0", borderTop: `1px solid ${S.border}`,
        }}>
          <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{s.label}</span>
          {s.value !== null ? (
            <span className="mono" style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}>{s.value}</span>
          ) : (
            <span className="mono" style={{
              fontSize: 9, color: S.textMuted,
              background: S.surface2, border: `1px dashed ${S.textMuted}`,
              borderRadius: 4, padding: "1px 6px", opacity: 0.6,
            }}>Coming soon</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Chunk 03 — Web Meeting Metrics
   ═══════════════════════════════════════════ */

function WebMeetingMetrics({ m }: { m: SalesMetrics }) {
  const p = m.pipeline;
  const cards = [
    { label: "Attendance Rate", value: `${p.attendanceRate}%`, desc: `${p.attended} of ${p.attended + p.webMeetingNoShow} attended`, badge: p.attendanceRate >= 70 ? "green" : "amber", badgeText: p.attendanceRate >= 70 ? "Above target" : "Below target" },
    { label: "No-Show Rate", value: `${p.noShowRate}%`, desc: `${p.webMeetingNoShow} leads no-showed`, badge: "amber" as const, badgeText: "Monitoring" },
    { label: "Re-engagement", value: "—", desc: "Tracking from setup", badge: "blue" as const, badgeText: "Coming soon" },
    { label: "Post-Meeting Close", value: `${p.postMeetingConversion}%`, desc: `${p.customer} customers from ${p.warm + p.specialOffer + p.customer} attended`, badge: p.postMeetingConversion >= 30 ? "green" : "amber", badgeText: p.postMeetingConversion >= 30 ? "Strong" : "Needs focus" },
  ];
  const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: "rgba(93,129,86,0.15)", text: S.greenHi, border: "rgba(93,129,86,0.3)" },
    amber: { bg: "rgba(200,146,42,0.15)", text: S.amber, border: "rgba(200,146,42,0.3)" },
    red: { bg: "rgba(155,58,58,0.15)", text: "#e07070", border: "rgba(155,58,58,0.3)" },
    blue: { bg: "rgba(58,107,155,0.15)", text: "#70a8e0", border: "rgba(58,107,155,0.3)" },
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        {cards.map((c, i) => {
          const bc = badgeColors[c.badge] || badgeColors.green;
          return (
            <div key={i} style={{
              background: S.surface, border: `1px solid ${S.border}`,
              borderRadius: 8, padding: 14,
            }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 8 }}>{c.label}</div>
              <div className="orb" style={{ fontSize: 24, color: S.text, marginBottom: 3 }}>{c.value}</div>
              <div className="mono" style={{ fontSize: 9, color: S.textMuted, marginBottom: 6 }}>{c.desc}</div>
              <span className="mono" style={{
                fontSize: 9, padding: "2px 8px", borderRadius: 4,
                background: bc.bg, color: bc.text, border: `1px solid ${bc.border}`,
              }}>{c.badgeText}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 10 }}>Post-Meeting Pipeline</div>
          {[
            { label: "Warm leads", value: p.warm },
            { label: "Special offer applied", value: p.specialOffer },
            { label: "Converted to customer", value: p.customer },
          ].map((r, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 0", borderTop: `1px solid ${S.border}`,
            }}>
              <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{r.label}</span>
              <span className="mono" style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: S.textDim, textTransform: "uppercase", marginBottom: 10 }}>Pipeline Status</div>
          {[
            { label: "Warm leads to convert", value: String(p.warm) },
            { label: "Offers awaiting decision", value: String(p.specialOffer) },
            { label: "No-shows to re-engage", value: String(p.webMeetingNoShow) },
            { label: "Future leads (nurture)", value: String(p.future) },
          ].map((r, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 0", borderTop: `1px solid ${S.border}`,
            }}>
              <span className="mono" style={{ fontSize: 9, color: S.textDim }}>{r.label}</span>
              <span className="mono" style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Chunk 04 — Special Offers
   ═══════════════════════════════════════════ */

function SpecialOffers({ m }: { m: SalesMetrics }) {
  const o = m.offers;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <KPI label="Active Offers" value={o.active} sub="Awaiting decision" />
        <KPI label="Expiring This Week" value={o.expiringThisWeek} accent={o.expiringThisWeek > 0 ? S.red : S.green} sub={o.expiringThisWeek > 0 ? "Action required" : "All clear"} />
        <KPI label="Expiring This Month" value={o.expiringThisMonth} accent={S.amber} />
        <KPI label="Offer Close Rate" value="—" sub="Tracking from setup" />
      </div>
      {o.items.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Lead", "Profile", "Offer", "Expiry", "Days Left", "Status"].map(h => (
                  <th key={h} className="mono" style={{
                    padding: "8px 12px", textAlign: "left",
                    fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                    color: S.textMuted, fontWeight: 500,
                    borderBottom: `1px solid ${S.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {o.items.map(item => {
                const urgent = item.daysLeft !== null && item.daysLeft <= 7;
                const soon = item.daysLeft !== null && item.daysLeft <= 30;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid rgba(93,129,86,0.06)` }}>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: S.text }}>{item.name}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: S.textDim }}>{item.profile || "—"}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: S.textDim }}>{item.offerType}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, color: urgent ? "#e07070" : soon ? S.amber : S.textDim }}>{item.expiry || "—"}</td>
                    <td className="mono" style={{ padding: "10px 12px", fontSize: 11, fontWeight: 500, color: urgent ? "#e07070" : soon ? S.amber : S.textDim }}>
                      {item.daysLeft !== null ? `${item.daysLeft} days` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="mono" style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 4,
                        background: "rgba(200,146,42,0.15)", color: S.amber,
                        border: "1px solid rgba(200,146,42,0.3)",
                      }}>{item.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {o.items.length === 0 && (
        <div className="mono" style={{ fontSize: 11, color: S.textMuted, textAlign: "center", padding: 20 }}>
          No active special offers
        </div>
      )}
    </>
  );
}
