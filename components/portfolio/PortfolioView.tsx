"use client";

// Portfolio Intelligence Dashboard — JARVIS shell view.
// Mounted inline by app/page.tsx (same pattern as LucyView). Reads from
// portfolio/data/*.json via @/lib/portfolio/data-loader. Real charts,
// candidate evaluator, projection tool are follow-up work — see
// portfolio/CLAUDE.md §9.

import { C } from "@/lib/jarvis-design";
import {
  loadPortfolioMeta,
  loadHoldings,
  loadDevelopments,
} from "@/lib/portfolio/data-loader";

// Brand-coloured ticker tints — softened with hex-alpha for the dark shell
const TICKER_BG: Record<string, string> = {
  TSLA:  "#dc262622",
  GOOGL: "#1d4ed822",
  SPCX:  "#7c3aed22",
};
const TICKER_FG: Record<string, string> = {
  TSLA:  "#f87171",
  GOOGL: "#7aa7ff",
  SPCX:  "#c4a8ff",
};

const tickerBg = (t: string) => TICKER_BG[t.toUpperCase()] ?? `${C.primary}22`;
const tickerFg = (t: string) => TICKER_FG[t.toUpperCase()] ?? C.bright;

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

// Dual probability semantic colour (pass / watch / triggered) on JARVIS palette
function probColour(value: number): string {
  if (value >= 0.6) return C.bright;
  if (value >= 0.4) return C.amber;
  return C.red;
}

export function PortfolioView() {
  const meta = loadPortfolioMeta();
  const holdings = loadHoldings();
  const developments = loadDevelopments();

  const concentratedHoldings = holdings.filter(h => !h.isCandidate);
  const candidates = holdings.filter(h => h.isCandidate);

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: 20,
        color: C.text,
      }}
    >
      {/* ── Header strip (panel, matches Bubble / Lucy header styling) ─────── */}
      <header
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: "14px 18px",
          marginBottom: 16,
        }}
      >
        <div
          className="orb"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: C.primary,
            marginBottom: 6,
          }}
        >
          PORTFOLIO INTELLIGENCE · FRAMEWORK V{meta.frameworkVersion}
        </div>
        <h1
          className="raj"
          style={{ fontSize: 18, fontWeight: 600, color: C.text, lineHeight: 1.3 }}
        >
          {meta.investorName} — permanent capital · billion-lives thesis
        </h1>

        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <Kpi label="MONTHLY CONTRIBUTION" value={`£${meta.monthlyContribution.toLocaleString()}`} />
          <Kpi label="AVG DUAL PROBABILITY" value={pct(meta.kpis.avgDualProbability)} />
          <Kpi
            label="TIER 1 TRIGGERS"
            value={`${meta.kpis.tier1TriggersActive} / ${meta.kpis.tier1TriggersTotal}`}
            valueColour={
              meta.kpis.tier1TriggersActive > 0 ? C.amber : C.bright
            }
          />
          <Kpi label="NEXT REVIEW" value={meta.nextReviewDate} />
        </div>
      </header>

      {/* ── Master thesis bar (placeholder — populate from framework/thesis.md) */}
      <section
        style={{
          borderLeft: `3px solid ${C.primary}`,
          padding: "10px 14px",
          background: `${C.primary}0a`,
          marginBottom: 20,
          color: C.textMid,
          fontStyle: "italic",
          borderRadius: 4,
        }}
      >
        <span className="mono" style={{ fontSize: 9, color: C.primary, letterSpacing: "0.14em", marginRight: 8 }}>
          MASTER THESIS
        </span>
        Populate from <code style={{ color: C.bright }}>portfolio/framework/thesis.md</code> in the
        first quarterly update.
      </section>

      {/* ── Concentrated positions grid ─────────────────────────────────────── */}
      <SectionLabel>CONCENTRATED POSITIONS</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {concentratedHoldings.map(h => (
          <div
            key={h.ticker}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                className="mono"
                style={{
                  background: tickerBg(h.ticker),
                  color: tickerFg(h.ticker),
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 3,
                  letterSpacing: "0.08em",
                }}
              >
                {h.ticker}
              </span>
              <strong className="raj" style={{ fontSize: 14, color: C.text }}>
                {h.name}
              </strong>
            </div>
            <div className="mono" style={{ fontSize: 9, color: C.textLow, marginBottom: 12, letterSpacing: "0.06em" }}>
              {h.subtitle.toUpperCase()} · {pct(h.allocation)} · {h.decisionLabel.toUpperCase()}
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <DualProb label="P(1B lives)" value={h.probabilities.billionLives.value} />
              <DualProb label="P(50yr)"     value={h.probabilities.fiftyYear.value} />
            </div>
            <p
              className="raj"
              style={{
                fontSize: 12,
                color: C.textMid,
                marginTop: 12,
                lineHeight: 1.5,
                fontWeight: 300,
              }}
            >
              {h.thesis}
            </p>
          </div>
        ))}
      </div>

      {/* ── Candidates ─────────────────────────────────────────────────────── */}
      {candidates.length > 0 && (
        <>
          <SectionLabel>CANDIDATES (WATCHLIST)</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {candidates.map(c => (
              <div
                key={c.ticker}
                style={{
                  background: `${C.amber}0e`,
                  border: `1px dashed ${C.amber}55`,
                  borderRadius: 6,
                  padding: 14,
                }}
              >
                <strong className="raj" style={{ fontSize: 14, color: C.text }}>
                  {c.name}
                </strong>
                <div className="mono" style={{ fontSize: 9, color: C.textLow, marginTop: 4, letterSpacing: "0.06em" }}>
                  {c.subtitle.toUpperCase()} · {c.decisionLabel.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Developments feed ──────────────────────────────────────────────── */}
      <SectionLabel>TOP DEVELOPMENTS — {developments.quarter}</SectionLabel>
      {developments.items.length === 0 ? (
        <p className="raj" style={{ color: C.textLow, fontSize: 12, fontStyle: "italic" }}>
          No developments recorded yet. Add them to{" "}
          <code style={{ color: C.bright }}>portfolio/data/developments.json</code> during the quarterly update.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {developments.items.map((d, i) => (
            <li
              key={i}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: "8px 12px",
                marginBottom: 6,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                className="mono"
                style={{
                  background: tickerBg(d.tag),
                  color: tickerFg(d.tag),
                  fontSize: 9,
                  padding: "2px 5px",
                  borderRadius: 3,
                }}
              >
                {d.tag}
              </span>
              <span className="raj" style={{ fontSize: 12, color: C.text }}>
                {d.text}
              </span>
              {d.isSignificant && (
                <span className="mono" style={{ marginLeft: "auto", fontSize: 9, color: C.red, letterSpacing: "0.1em" }}>
                  SIGNIFICANT
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="mono" style={{ marginTop: 32, fontSize: 9, color: C.textLow, letterSpacing: "0.1em" }}>
        SCAFFOLD V1.0 · BUILD QUEUE: portfolio/CLAUDE.md §9
      </footer>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="orb"
      style={{
        fontSize: 9,
        letterSpacing: "0.22em",
        color: C.primary,
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.primary}44, transparent)` }} />
      {children}
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.primary}44)` }} />
    </div>
  );
}

function Kpi({
  label,
  value,
  valueColour,
}: {
  label: string;
  value: string;
  valueColour?: string;
}) {
  return (
    <div>
      <div
        className="mono"
        style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.14em" }}
      >
        {label}
      </div>
      <div
        className="orb"
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginTop: 2,
          color: valueColour ?? C.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DualProb({ label, value }: { label: string; value: number }) {
  const colour = probColour(value);
  return (
    <div>
      <div
        className="mono"
        style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.1em" }}
      >
        {label}
      </div>
      <div
        className="orb"
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: colour,
          marginTop: 2,
        }}
      >
        {pct(value)}
      </div>
    </div>
  );
}
