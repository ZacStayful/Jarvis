"use client";

// Shared building blocks for the data views (retention dashboard first).
// Same visual language as MarketingDepartmentView's file-local helpers:
// surface panels with a coloured top rule, 9px letter-spaced mono labels,
// Orbitron numbers, Rajdhani body. Colours come from lib/jarvis-design.

import type { ReactNode } from "react";
import { C } from "@/lib/jarvis-design";

export function Panel({
  title,
  accent = C.primary,
  right,
  wide = false,
  children,
}: {
  title: string;
  accent?: string;
  right?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={wide ? "jv-wide" : undefined}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderTop: `2px solid ${accent}`,
        borderRadius: 6,
        padding: 16,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent }} />
        <span className="orb" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", color: accent }}>
          {title}
        </span>
        {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
      </div>
      {children}
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.14em", marginBottom: 4 }}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.14em" }}>
        {label}
      </div>
      <div className="orb" style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: tone ?? C.text }}>
        {value}
      </div>
      {sub && (
        <div className="raj" style={{ fontSize: 11.5, color: C.textMid, marginTop: 2, lineHeight: 1.35 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Chip({ colour, children, onClick, active }: { colour: string; children: ReactNode; onClick?: () => void; active?: boolean }) {
  const style = {
    fontSize: 9,
    letterSpacing: "0.14em",
    color: colour,
    border: `1px solid ${colour}${active ? "" : "88"}`,
    background: active ? `${colour}30` : `${colour}18`,
    padding: "3px 8px",
    borderRadius: 3,
    cursor: onClick ? "pointer" : "default",
    font: "inherit",
  } as const;
  if (onClick) {
    return (
      <button type="button" className="mono" onClick={onClick} style={style}>
        {children}
      </button>
    );
  }
  return (
    <span className="mono" style={style}>
      {children}
    </span>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return (
    <p className="raj" style={{ fontSize: 12.5, color: C.textLow, lineHeight: 1.5, fontStyle: "italic", marginTop: 8 }}>
      {children}
    </p>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="jv-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Notice({ tone, title, children }: { tone: "warn" | "error" | "info"; title: string; children: ReactNode }) {
  const colour = tone === "error" ? C.red : tone === "warn" ? C.amber : C.cyan;
  return (
    <div
      style={{
        border: `1px dashed ${colour}77`,
        background: `${colour}10`,
        borderRadius: 6,
        padding: "10px 14px",
        marginBottom: 14,
      }}
    >
      <div className="orb" style={{ fontSize: 9, letterSpacing: "0.2em", color: colour, marginBottom: 4 }}>
        {title}
      </div>
      <div className="raj" style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

/** A thin proportional bar with its label and value on one line. */
export function Bar({ label, value, max, colour = C.primary, note }: { label: string; value: number; max: number; colour?: string; note?: string }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span className="raj" style={{ fontSize: 12.5, color: C.text }}>
          {label}
        </span>
        <span className="mono" style={{ fontSize: 10, color: C.textMid, whiteSpace: "nowrap" }}>
          {value.toLocaleString("en-GB")}
          {note ? ` · ${note}` : ""}
        </span>
      </div>
      <div style={{ height: 4, background: C.surfHi, borderRadius: 2, marginTop: 3 }}>
        <div style={{ width: `${width}%`, height: 4, background: colour, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export const PANELS_CSS = `
  .jv-grid {
    display: grid; gap: 16px; align-items: start;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  }
  .jv-wide { grid-column: 1 / -1; }
  .jv-kpis { display: grid; gap: 14px 18px; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  .jv-table { width: 100%; border-collapse: collapse; font-family: 'Rajdhani', sans-serif; font-size: 12.5px; }
  .jv-table th {
    text-align: left; font-family: 'Share Tech Mono', monospace; font-size: 8.5px; font-weight: 400;
    letter-spacing: 0.12em; color: ${C.textLow}; padding: 0 8px 6px 0; white-space: nowrap;
  }
  .jv-table td { color: ${C.text}; padding: 5px 8px 5px 0; border-top: 1px solid ${C.border}; vertical-align: top; }
  .jv-table td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
`;
