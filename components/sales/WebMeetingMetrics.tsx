import { S } from "./styles";
import type { PipelineMetrics, SalesMetrics } from "./types";

interface Props {
  pipeline: PipelineMetrics;
  activityLogsAvailable?: boolean;
}

export function WebMeetingMetrics({ pipeline: p, activityLogsAvailable }: Props) {
  const reengagementLabel = activityLogsAvailable
    ? `${p.wasNoShowedCount ?? 0} re-engaged`
    : "Tracking from setup";
  const cards: {
    label: string;
    value: string;
    desc: string;
    badge: "green" | "amber" | "red" | "blue";
    badgeText: string;
  }[] = [
    {
      label: "Attendance Rate",
      value: `${p.attendanceRate}%`,
      desc: `${p.attended} of ${p.attended + p.webMeetingNoShow} attended`,
      badge: p.attendanceRate >= 70 ? "green" : "amber",
      badgeText: p.attendanceRate >= 70 ? "Above target" : "Below target",
    },
    {
      label: "No-Show Rate",
      value: `${p.noShowRate}%`,
      desc: `${p.webMeetingNoShow} leads no-showed`,
      badge: "amber",
      badgeText: "Monitoring",
    },
    {
      label: "Re-engagement",
      value: activityLogsAvailable ? `${p.wasNoShowedCount ?? 0}` : "—",
      desc: reengagementLabel,
      badge: activityLogsAvailable ? "green" : "blue",
      badgeText: activityLogsAvailable ? "Active" : "Coming soon",
    },
    {
      label: "Post-Meeting Close",
      value: `${p.postMeetingConversion}%`,
      desc: `${p.customer} customers from ${p.warm + p.specialOffer + p.customer} attended`,
      badge: p.postMeetingConversion >= 30 ? "green" : "amber",
      badgeText: p.postMeetingConversion >= 30 ? "Strong" : "Needs focus",
    },
  ];
  const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: "rgba(93,129,86,0.15)", text: S.greenHi, border: "rgba(93,129,86,0.3)" },
    amber: { bg: "rgba(200,146,42,0.15)", text: S.amber, border: "rgba(200,146,42,0.3)" },
    red: { bg: "rgba(155,58,58,0.15)", text: "#e07070", border: "rgba(155,58,58,0.3)" },
    blue: { bg: "rgba(58,107,155,0.15)", text: "#70a8e0", border: "rgba(58,107,155,0.3)" },
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 14,
        }}
      >
        {cards.map((c, i) => {
          const bc = badgeColors[c.badge] || badgeColors.green;
          return (
            <div
              key={i}
              style={{
                background: S.surface,
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: S.textDim,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {c.label}
              </div>
              <div
                className="orb"
                style={{ fontSize: 24, color: S.text, marginBottom: 3 }}
              >
                {c.value}
              </div>
              <div
                className="mono"
                style={{ fontSize: 9, color: S.textMuted, marginBottom: 6 }}
              >
                {c.desc}
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: bc.bg,
                  color: bc.text,
                  border: `1px solid ${bc.border}`,
                }}
              >
                {c.badgeText}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div
          style={{
            background: S.surface,
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              color: S.textDim,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Post-Meeting Pipeline
          </div>
          {[
            { label: "Warm leads", value: p.warm },
            { label: "Special offer applied", value: p.specialOffer },
            { label: "Converted to customer", value: p.customer },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                borderTop: `1px solid ${S.border}`,
              }}
            >
              <span className="mono" style={{ fontSize: 9, color: S.textDim }}>
                {r.label}
              </span>
              <span
                className="mono"
                style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            background: S.surface,
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              color: S.textDim,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Pipeline Status
          </div>
          {[
            { label: "Warm leads to convert", value: String(p.warm) },
            { label: "Offers awaiting decision", value: String(p.specialOffer) },
            { label: "No-shows to re-engage", value: String(p.webMeetingNoShow) },
            { label: "Future leads (nurture)", value: String(p.future) },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                borderTop: `1px solid ${S.border}`,
              }}
            >
              <span className="mono" style={{ fontSize: 9, color: S.textDim }}>
                {r.label}
              </span>
              <span
                className="mono"
                style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function WebMeetingMetricsFromMetrics({ m }: { m: SalesMetrics }) {
  return (
    <WebMeetingMetrics
      pipeline={m.pipeline}
      activityLogsAvailable={m.activityLogsAvailable}
    />
  );
}
