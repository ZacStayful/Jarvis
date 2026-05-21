"use client";

import { useEffect, useRef, useState } from "react";
import { S } from "./styles";
import { KPI } from "./KPI";
import type { DateRange, PipelineMetrics, SalesMetrics } from "./types";

interface Props {
  pipeline: PipelineMetrics;
  total: number;
  range: DateRange;
  speak?: (text: string) => Promise<void>;
  isSpeaking?: boolean;
}

export function PipelineFunnel({
  pipeline: p,
  total,
  range,
  speak,
  isSpeaking,
}: Props) {
  const funnelSteps = [
    { label: "Cold Leads", value: p.cold, pct: 100, color: S.green },
    {
      label: "Abandoned",
      value: p.abandoned,
      pct: p.qualificationDropoff,
      color: S.red,
      dropoff: `${p.qualificationDropoff}% drop-off`,
    },
    { label: "Future (too early)", value: p.future, pct: p.futureRate, color: S.blue },
    {
      label: "Web Meeting Booked",
      value: p.webMeetingBooked,
      pct: total > 0 ? Math.round((p.webMeetingBooked / total) * 100) : 0,
      color: S.green,
    },
    { label: "No Show", value: p.webMeetingNoShow, pct: p.noShowRate, color: S.red },
    {
      label: "Warm / In Progress",
      value: p.warm + p.specialOffer,
      pct:
        total > 0
          ? Math.round(((p.warm + p.specialOffer) / total) * 100)
          : 0,
      color: S.amber,
    },
    {
      label: "Customer",
      value: p.customer,
      pct: p.overallConversion,
      color: S.green,
    },
  ];

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <KPI label="Cold Leads" value={p.cold} sub="This period" />
        <KPI
          label="Abandoned"
          value={p.abandoned}
          sub={`${p.qualificationDropoff}% drop-off`}
          accent={S.red}
        />
        <KPI label="Web Meetings" value={p.webMeetingBooked} />
        <KPI label="Customers" value={p.customer} accent={S.greenHi} />
        <KPI
          label="Cold → Customer"
          value={`${p.overallConversion}%`}
          sub="Overall conversion"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {funnelSteps.map((step, i) => (
          <div key={i}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span className="mono" style={{ fontSize: 10, color: S.textDim }}>
                {step.label}
              </span>
              <span className="mono" style={{ fontSize: 10, color: S.greenHi }}>
                {step.value}{" "}
                <span style={{ color: S.textMuted, fontSize: 9 }}>
                  ({step.pct}%)
                </span>
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: S.surface2,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 4,
                  width: `${Math.max(step.pct, 2)}%`,
                  background: `linear-gradient(90deg, ${step.color}88, ${step.color})`,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            {step.dropoff && (
              <div
                className="mono"
                style={{ fontSize: 9, color: S.red, marginTop: 2 }}
              >
                ▼ {step.dropoff}
              </div>
            )}
          </div>
        ))}
      </div>
      <AISummaryCard range={range} speak={speak} isSpeaking={isSpeaking} />
    </>
  );
}

function AISummaryCard({
  range,
  speak,
  isSpeaking,
}: {
  range: DateRange;
  speak?: (text: string) => Promise<void>;
  isSpeaking?: boolean;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const spokenForKey = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSummary(null);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    fetch(`/api/sales/summary?${params}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok || body.error) {
          throw new Error(body.error || `HTTP ${r.status}`);
        }
        return body;
      })
      .then((data) => {
        if (cancelled) return;
        setSummary(data.summary || data.text || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Summary unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  // Speak the summary once per (date-range, summary) combo. If the browser
  // hasn't had a user gesture yet, useTTS will silently no-op — clicking
  // the voice pill (or the "Speak again" button below) gives the gesture
  // and unblocks future plays.
  useEffect(() => {
    if (!speak || !summary) return;
    const key = `${range.from || ""}|${range.to || ""}|${summary.slice(0, 32)}`;
    if (spokenForKey.current === key) return;
    spokenForKey.current = key;
    speak(summary).catch(() => {
      // Autoplay blocked — user can hit "Speak again" to retry.
    });
  }, [summary, range.from, range.to, speak]);

  const handleSpeakAgain = () => {
    if (!speak || !summary) return;
    speak(summary).catch(() => {});
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: "linear-gradient(180deg, rgba(93,129,86,0.06), rgba(93,129,86,0.02))",
        border: `1px solid ${S.borderHi}`,
        borderRadius: 8,
        padding: "14px 16px",
        position: "relative",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          color: S.greenHi,
          textTransform: "uppercase",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: S.green,
            animation:
              loading || isSpeaking ? "pulse 1.5s ease infinite" : "none",
          }}
        />
        <span>JARVIS Briefing</span>
        {summary && speak && (
          <button
            type="button"
            onClick={handleSpeakAgain}
            disabled={isSpeaking}
            className="mono"
            style={{
              marginLeft: "auto",
              background: isSpeaking ? S.greenPale : "transparent",
              border: `1px solid ${S.border}`,
              color: isSpeaking ? S.greenHi : S.textDim,
              fontSize: 8,
              letterSpacing: "0.12em",
              padding: "3px 9px",
              borderRadius: 999,
              cursor: isSpeaking ? "default" : "pointer",
            }}
          >
            {isSpeaking ? "SPEAKING…" : "▶ SPEAK"}
          </button>
        )}
      </div>
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[80, 95, 70].map((w, i) => (
            <div
              key={i}
              style={{
                height: 10,
                width: `${w}%`,
                background: S.surface2,
                borderRadius: 4,
                animation: "pulse 1.5s ease infinite",
              }}
            />
          ))}
        </div>
      )}
      {error && !loading && (
        <div
          className="mono"
          style={{ fontSize: 11, color: S.textMuted, lineHeight: 1.5 }}
        >
          Summary unavailable — {error}. Say &quot;summarise&quot; or refresh
          to retry.
        </div>
      )}
      {summary && !loading && (
        <div
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontSize: 14,
            color: S.text,
            lineHeight: 1.55,
            letterSpacing: "0.01em",
          }}
        >
          {summary}
        </div>
      )}
    </div>
  );
}

export function PipelineFunnelFromMetrics({ m, range }: { m: SalesMetrics; range: DateRange }) {
  return <PipelineFunnel pipeline={m.pipeline} total={m.total} range={range} />;
}
