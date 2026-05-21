import { S } from "./styles";

export function KPI({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: S.surface,
        border: `1px solid ${S.border}`,
        borderRadius: 8,
        padding: "14px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent || S.green,
          opacity: 0.6,
        }}
      />
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: S.textDim,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        className="orb"
        style={{ fontSize: 26, color: S.text, lineHeight: 1, marginBottom: 4 }}
      >
        {value}
      </div>
      {sub && (
        <div className="mono" style={{ fontSize: 9, color: S.textMuted }}>
          {sub}
        </div>
      )}
    </div>
  );
}
