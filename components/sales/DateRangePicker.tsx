import { ArrowRight } from "lucide-react";
import { S } from "./styles";
import type { PresetKey } from "./types";

export function DateRangePicker({
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
}: {
  preset: PresetKey;
  onPreset: (p: PresetKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
}) {
  const presets: { key: PresetKey; label: string }[] = [
    { key: "week", label: "WEEK" },
    { key: "month", label: "MONTH" },
    { key: "year", label: "YEAR" },
    { key: "custom", label: "CUSTOM" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          display: "flex",
          gap: 2,
          background: S.surface,
          border: `1px solid ${S.border}`,
          borderRadius: 6,
          padding: 3,
        }}
      >
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className="mono"
            style={{
              padding: "3px 10px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontSize: 9,
              letterSpacing: "0.08em",
              background: preset === p.key ? S.greenPale : "transparent",
              color: preset === p.key ? S.greenHi : S.textDim,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFrom(e.target.value)}
            className="mono"
            style={{
              background: S.surface,
              border: `1px solid ${S.border}`,
              borderRadius: 4,
              color: S.textDim,
              padding: "2px 6px",
              fontSize: 9,
            }}
          />
          <ArrowRight size={10} color={S.textMuted} />
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomTo(e.target.value)}
            className="mono"
            style={{
              background: S.surface,
              border: `1px solid ${S.border}`,
              borderRadius: 4,
              color: S.textDim,
              padding: "2px 6px",
              fontSize: 9,
            }}
          />
        </div>
      )}
    </div>
  );
}
