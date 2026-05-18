"use client";

// Portfolio Intelligence Dashboard — minimal scaffold view.
// Reads from portfolio/data/*.json via @/lib/portfolio/data-loader.
// Real position cards, charts, evaluator etc. are follow-up work — see
// portfolio/CLAUDE.md §9 "Scaffold status".

import {
  loadPortfolioMeta,
  loadHoldings,
  loadDevelopments,
} from "@/lib/portfolio/data-loader";

const COLOR = {
  pass: "#16a34a",
  watch: "#ca8a04",
  triggered: "#dc2626",
  thesis: "#0f172a",
  surface: "#f8fafc",
  border: "#e5e7eb",
  muted: "#64748b",
  tsla: "#dc2626",
  googl: "#1d4ed8",
  spcx: "#7c3aed",
  macro: "#475569",
};

const tagColor = (ticker: string): string => {
  switch (ticker.toUpperCase()) {
    case "TSLA":
      return COLOR.tsla;
    case "GOOGL":
      return COLOR.googl;
    case "SPCX":
      return COLOR.spcx;
    default:
      return COLOR.muted;
  }
};

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function PortfolioView() {
  const meta = loadPortfolioMeta();
  const holdings = loadHoldings();
  const developments = loadDevelopments();

  const concentratedHoldings = holdings.filter(h => !h.isCandidate);
  const candidates = holdings.filter(h => h.isCandidate);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLOR.surface,
        color: COLOR.thesis,
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
      }}
    >
      {/* ── Header / KPI strip ─────────────────────────────────────────── */}
      <header
        style={{
          background: COLOR.thesis,
          color: "white",
          padding: "20px 24px",
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.18em", fontFamily: "monospace" }}>
          PORTFOLIO INTELLIGENCE · FRAMEWORK V{meta.frameworkVersion}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>
          {meta.investorName} — permanent capital · billion-lives thesis
        </h1>

        <div style={{ display: "flex", gap: 32, marginTop: 16, flexWrap: "wrap" }}>
          <Kpi label="MONTHLY CONTRIBUTION" value={`£${meta.monthlyContribution.toLocaleString()}`} />
          <Kpi label="AVG DUAL PROBABILITY" value={pct(meta.kpis.avgDualProbability)} />
          <Kpi label="TIER 1 TRIGGERS ACTIVE" value={`${meta.kpis.tier1TriggersActive} / ${meta.kpis.tier1TriggersTotal}`} />
          <Kpi label="NEXT REVIEW" value={meta.nextReviewDate} />
        </div>
      </header>

      {/* ── Master thesis bar (placeholder; populate from framework/thesis.md) ── */}
      <section
        style={{
          borderLeft: `4px solid ${COLOR.thesis}`,
          padding: "12px 16px",
          background: "white",
          marginBottom: 24,
          fontStyle: "italic",
          color: COLOR.muted,
        }}
      >
        Master thesis — populate from <code>portfolio/framework/thesis.md</code> in the
        first quarterly update.
      </section>

      {/* ── Position grid ─────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 13, letterSpacing: "0.14em", color: COLOR.muted, fontFamily: "monospace", marginBottom: 12 }}>
        CONCENTRATED POSITIONS
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 32 }}>
        {concentratedHoldings.map(h => (
          <div
            key={h.ticker}
            style={{
              background: "white",
              border: `1px solid ${COLOR.border}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  background: tagColor(h.ticker),
                  color: "white",
                  fontFamily: "monospace",
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 3,
                  letterSpacing: "0.06em",
                }}
              >
                {h.ticker}
              </span>
              <strong style={{ fontSize: 15 }}>{h.name}</strong>
            </div>
            <div style={{ fontSize: 11, color: COLOR.muted, marginBottom: 12 }}>
              {h.subtitle} · {pct(h.allocation)} allocation · {h.decisionLabel}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <DualProb label="P(1B lives)" value={h.probabilities.billionLives.value} />
              <DualProb label="P(50yr)"    value={h.probabilities.fiftyYear.value} />
            </div>
            <p style={{ fontSize: 12, color: COLOR.muted, marginTop: 12, lineHeight: 1.5 }}>
              {h.thesis}
            </p>
          </div>
        ))}
      </div>

      {/* ── Candidates ───────────────────────────────────────────────── */}
      {candidates.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, letterSpacing: "0.14em", color: COLOR.muted, fontFamily: "monospace", marginBottom: 12 }}>
            CANDIDATES (WATCHLIST)
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 32 }}>
            {candidates.map(c => (
              <div
                key={c.ticker}
                style={{
                  background: `${COLOR.watch}11`,
                  border: `1px dashed ${COLOR.watch}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <strong>{c.name}</strong>
                <div style={{ fontSize: 11, color: COLOR.muted, marginTop: 4 }}>
                  {c.subtitle} · {c.decisionLabel}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Developments feed ─────────────────────────────────────────── */}
      <h2 style={{ fontSize: 13, letterSpacing: "0.14em", color: COLOR.muted, fontFamily: "monospace", marginBottom: 12 }}>
        TOP DEVELOPMENTS — {developments.quarter}
      </h2>
      {developments.items.length === 0 ? (
        <p style={{ color: COLOR.muted, fontSize: 13 }}>
          No developments recorded yet. Add them to{" "}
          <code>portfolio/data/developments.json</code> during the quarterly update.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {developments.items.map((d, i) => (
            <li
              key={i}
              style={{
                background: "white",
                border: `1px solid ${COLOR.border}`,
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 6,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: tagColor(d.tag),
                  color: "white",
                  fontFamily: "monospace",
                  fontSize: 9,
                  padding: "2px 5px",
                  borderRadius: 3,
                }}
              >
                {d.tag}
              </span>
              <span style={{ fontSize: 13 }}>{d.text}</span>
              {d.isSignificant && (
                <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 10, color: COLOR.triggered }}>
                  SIGNIFICANT
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer style={{ marginTop: 48, fontSize: 11, color: COLOR.muted }}>
        Scaffold v1.0 — see <code>portfolio/CLAUDE.md §9</code> for the build queue.
        Run the first quarterly update to populate real values.
      </footer>
    </div>
  );
}

// ── Local helpers ──────────────────────────────────────────────────────

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: "0.14em", fontFamily: "monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DualProb({ label, value }: { label: string; value: number }) {
  const colour = value >= 0.6 ? COLOR.pass : value >= 0.4 ? COLOR.watch : COLOR.triggered;
  return (
    <div>
      <div style={{ fontSize: 10, color: COLOR.muted, fontFamily: "monospace" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: colour, fontFamily: "monospace" }}>
        {pct(value)}
      </div>
    </div>
  );
}
