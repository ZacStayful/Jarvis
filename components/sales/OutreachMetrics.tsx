import { S } from "./styles";
import type { OutreachMetricsData, SalesMetrics } from "./types";

interface Props {
  outreach: OutreachMetricsData;
}

export function OutreachMetrics({ outreach: o }: Props) {
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

function ChannelCard({
  icon,
  value,
  sub,
  stats,
  comingSoon,
}: {
  icon: string;
  value: number | null;
  sub: string;
  stats: { label: string; value: string | null }[];
  comingSoon?: boolean;
}) {
  return (
    <div
      style={{
        background: S.surface,
        border: `1px solid ${S.border}`,
        borderRadius: 8,
        padding: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
          opacity: 0.4,
        }}
      />
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: S.greenDim,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: comingSoon ? S.textMuted : S.green,
          }}
        />
        {icon}
      </div>
      <div
        className="orb"
        style={{
          fontSize: 32,
          color: comingSoon ? S.textMuted : S.text,
          lineHeight: 1,
          marginBottom: 3,
        }}
      >
        {value !== null ? value : "—"}
      </div>
      <div
        className="mono"
        style={{ fontSize: 9, color: S.textMuted, marginBottom: 14 }}
      >
        {sub}
      </div>
      {stats.map((s, i) => (
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
            {s.label}
          </span>
          {s.value !== null ? (
            <span
              className="mono"
              style={{ fontSize: 10, color: S.greenHi, fontWeight: 500 }}
            >
              {s.value}
            </span>
          ) : (
            <span
              className="mono"
              style={{
                fontSize: 9,
                color: S.textMuted,
                background: S.surface2,
                border: `1px dashed ${S.textMuted}`,
                borderRadius: 4,
                padding: "1px 6px",
                opacity: 0.6,
              }}
            >
              Coming soon
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function OutreachMetricsFromMetrics({ m }: { m: SalesMetrics }) {
  return <OutreachMetrics outreach={m.outreach} />;
}
