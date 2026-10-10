"use client";

// Marketing Department view: Jarvis (performance) and Janet (creative) side
// by side, with the conversation column beside them so Zac can read the
// directors' replies as well as hear them. Mounted by app/page.tsx when
// routedView === "marketing-department".
//
// Data comes from /api/marketing (read-only stayful-ads, cached 1h server
// side). Every number is rendered as-is from the weekly snapshot; anything
// missing shows "—". Nothing here calculates or estimates performance.

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { C } from "@/lib/jarvis-design";
import { DIRECTORS } from "@/lib/ads/speakers";
import { campaignsByLane, openAbTests, warmAudienceSize } from "@/lib/ads/lanes";
import type {
  AngleCoverage,
  CapacityStageId,
  CapacityStageStatus,
  DepartmentData,
  Director,
  RegisterRow,
  SnapshotAd,
  SnapshotAdSet,
  SnapshotAudience,
  SnapshotCampaign,
  SnapshotCapacity,
  SnapshotDiagnosis,
  WeeklySnapshot,
} from "@/lib/ads/types";
import type { JARVISState, Message } from "@/types/jarvis";
import { JarvisEye } from "@/components/jarvis/JarvisEye";
import { Bubble } from "@/components/jarvis/Bubble";

// The scaling plan's ceiling. Used only if a snapshot omits ceiling_cpl_gbp.
const CEILING_FALLBACK_GBP = 27;
const MIN_WEEKS_FOR_TREND = 3;

const PIPELINE_STAGES = ["Proposed", "Approved", "In build", "Awaiting Zac", "Ready"] as const;
const CLOSED_STAGES = new Set(["uploaded", "dropped"]);

// ─── Formatting ───────────────────────────────────────────────────────────────

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

const gbp = (n: number | null | undefined) => (isNum(n) ? `£${n.toFixed(2)}` : "—");

const gbpDaily = (n: number | null | undefined) =>
  isNum(n) ? `£${Number.isInteger(n) ? n : n.toFixed(2)}/day` : "—";

const count = (n: number | null | undefined) => (isNum(n) ? n.toLocaleString("en-GB") : "—");

function fmtDate(value: string | null | undefined, withYear = true): string {
  if (!value) return "—";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

const normaliseStage = (status: string) =>
  status.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

// ─── Main view ────────────────────────────────────────────────────────────────

interface MarketingDepartmentViewProps {
  messages: Message[];
  state: JARVISState;
  feedRef: RefObject<HTMLDivElement | null>;
}

export function MarketingDepartmentView({ messages, state, feedRef }: MarketingDepartmentViewProps) {
  const [data, setData] = useState<DepartmentData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/marketing", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as DepartmentData | null;
        if (cancelled) return;
        if (body && Array.isArray(body.errors)) setData(body);
        else setLoadError(`The marketing route returned HTTP ${res.status}.`);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Network error.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const snapshot = data?.snapshot ?? null;

  return (
    <div className="mkt-shell">
      <style>{SHELL_CSS}</style>

      <aside className="mkt-chat">
        <div className="mkt-eye">
          <JarvisEye state={state} size={96} />
        </div>
        <div ref={feedRef} className="mkt-feed">
          {messages.length === 0 && (
            <p className="raj" style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6, fontWeight: 300 }}>
              Ask the department anything, e.g. &ldquo;How are the ads doing?&rdquo; or
              &ldquo;Janet, what are we making next?&rdquo;
            </p>
          )}
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
        </div>
      </aside>

      <section className="mkt-main">
        <ViewHeader snapshot={snapshot} />
        {loadError ? (
          <Notice tone="error" title="MARKETING DATA UNAVAILABLE">
            {loadError}
          </Notice>
        ) : !data ? (
          <div className="mono" style={{ fontSize: 10, color: C.textLow, letterSpacing: "0.14em" }}>
            LOADING THE DEPARTMENT…
          </div>
        ) : !data.ok || !snapshot ? (
          <Notice tone="error" title="MARKETING DATA UNAVAILABLE">
            {data.errors.length > 0 ? data.errors.join(" · ") : "The weekly snapshot could not be read."}
          </Notice>
        ) : (
          <>
            {data.errors.length > 0 && (
              <Notice tone="warn" title="SOME FILES COULDN'T BE READ">
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {data.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Notice>
            )}
            <div className="mkt-panels">
              <JarvisPanel snapshot={snapshot} history={data.history} />
              <JanetPanel data={data} snapshot={snapshot} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ViewHeader({ snapshot }: { snapshot: WeeklySnapshot | null }) {
  const source = [
    snapshot?.campaign?.name ? `Campaign: ${snapshot.campaign.name}` : null,
    snapshot?.generated_by ? `Source: ${snapshot.generated_by}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <header style={{ marginBottom: 16 }}>
      <div className="orb" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.primary, marginBottom: 6 }}>
        MARKETING DEPARTMENT · READ-ONLY
      </div>
      <h1 className="raj" style={{ fontSize: 20, fontWeight: 600, color: C.text, lineHeight: 1.25 }}>
        As of {fmtDate(snapshot?.week_ending)}
      </h1>
      {source && (
        <div className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.08em", marginTop: 4 }}>
          {source}
        </div>
      )}
    </header>
  );
}

// ─── Jarvis: performance ──────────────────────────────────────────────────────

function JarvisPanel({ snapshot, history }: { snapshot: WeeklySnapshot; history: WeeklySnapshot[] }) {
  const week = snapshot.week ?? {};
  const economics = snapshot.economics ?? {};
  const scaling = snapshot.scaling ?? {};
  const ceiling = isNum(economics.ceiling_cpl_gbp) ? economics.ceiling_cpl_gbp : CEILING_FALLBACK_GBP;
  const target = economics.target_cpl_gbp;
  const cpl = week.cost_per_lead_gbp;
  const underCeiling = isNum(cpl) ? cpl <= ceiling : null;
  const actions = snapshot.actions_for_zac ?? [];

  return (
    <Panel director="jarvis" title="PERFORMANCE">
      <Label>COST PER LEAD · THIS WEEK</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          className="orb"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: underCeiling === null ? C.text : underCeiling ? C.bright : C.red,
          }}
        >
          {gbp(cpl)}
        </span>
        {underCeiling !== null && (
          <Chip colour={underCeiling ? C.bright : C.red}>
            {underCeiling ? "UNDER" : "OVER"} {gbp(ceiling).replace(".00", "")} CEILING
          </Chip>
        )}
      </div>
      <div className="raj" style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>
        Target {isNum(target) ? gbp(target) : "not set yet"} · Ceiling {gbp(ceiling)}
      </div>
      <CeilingBar cpl={cpl} target={target} ceiling={ceiling} />

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }}>
        <Kpi label="LEADS THIS WEEK" value={count(week.leads)} />
        <Kpi label="DAILY BUDGET" value={gbpDaily(snapshot.campaign?.daily_budget_gbp)} />
        <Kpi label="PHASE" value={isNum(snapshot.phase) ? String(snapshot.phase) : "—"} />
      </div>

      <Block title="MY RECOMMENDATION" colour={C.primary}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Chip colour={C.cyan}>{scaling.decision ?? "NO DECISION"}</Chip>
          <span className="raj" style={{ fontSize: 13, color: C.text }}>
            Recommended budget {gbpDaily(scaling.recommended_daily_budget_gbp)}
          </span>
        </div>
        {scaling.reason && <Para>{scaling.reason}</Para>}
        <Situations diagnosis={snapshot.diagnosis ?? null} />
        <div className="mono" style={{ fontSize: 9, color: C.textMid, letterSpacing: "0.1em", marginTop: 6 }}>
          NEXT REVIEW · {fmtDate(scaling.next_review).toUpperCase()}
        </div>
      </Block>

      {(snapshot.campaigns ?? []).length > 0 && (
        <Block title="CAMPAIGNS BY LANE" colour={C.primary}>
          <Lanes campaigns={snapshot.campaigns ?? []} audiences={snapshot.audiences ?? []} />
        </Block>
      )}

      <Block title="LEAD DATABASE CAPACITY" colour={C.primary}>
        <CapacityPanel capacity={snapshot.capacity ?? null} asOf={snapshot.week_ending} />
      </Block>

      <Block title="FOR YOU IN ADS MANAGER" colour={C.primary}>
        {actions.length === 0 ? <Muted>Nothing this week.</Muted> : <BulletList items={actions} colour={C.primary} />}
      </Block>

      <Block title="TREND" colour={C.primary}>
        <Trend history={history} ceiling={ceiling} />
      </Block>

      <Block title="AD SETS" colour={C.primary}>
        <AdSetsTable adSets={snapshot.ad_sets ?? []} />
      </Block>

      <Block title="AD VERDICTS" colour={C.primary}>
        <AdVerdictsTable ads={snapshot.ads ?? []} />
      </Block>
    </Panel>
  );
}

function CeilingBar({
  cpl,
  target,
  ceiling,
}: {
  cpl: number | null | undefined;
  target: number | null | undefined;
  ceiling: number;
}) {
  if (!isNum(cpl)) return null;
  const max = Math.max(ceiling * 1.25, cpl * 1.05);
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const over = cpl > ceiling;
  return (
    <div style={{ position: "relative", height: 8, marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4 }}>
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: pos(cpl),
          background: over ? `${C.red}aa` : `${C.bright}aa`,
          borderRadius: 3,
        }}
      />
      <Marker left={pos(ceiling)} colour={C.red} title={`Ceiling ${gbp(ceiling)}`} />
      {isNum(target) && <Marker left={pos(target)} colour={C.cyan} title={`Target ${gbp(target)}`} />}
    </div>
  );
}

function Marker({ left, colour, title }: { left: string; colour: string; title: string }) {
  return (
    <div
      title={title}
      style={{ position: "absolute", left, top: -4, bottom: -4, width: 2, background: colour, transform: "translateX(-1px)" }}
    />
  );
}

function Trend({ history, ceiling }: { history: WeeklySnapshot[]; ceiling: number }) {
  const weeks = history.filter((w) => isNum(w.week?.cost_per_lead_gbp) || isNum(w.week?.leads));
  if (weeks.length < MIN_WEEKS_FOR_TREND) {
    return <Muted>Trend appears after three weekly reviews.</Muted>;
  }

  // viewBox sized so text stays legible from phone (~0.75x) to desktop (~1.25x)
  const W = 400;
  const padL = 40;
  const padR = 10;
  const lineTop = 8;
  const lineH = 64;
  const barsTop = lineTop + lineH + 12;
  const barsH = 26;
  const H = barsTop + barsH + 16;
  const font = { fontSize: 10, fontFamily: "Share Tech Mono, monospace" };

  const cpls = weeks.map((w) => w.week?.cost_per_lead_gbp);
  const leads = weeks.map((w) => w.week?.leads);
  const maxCpl = Math.max(ceiling * 1.15, ...cpls.filter(isNum));
  const maxLeads = Math.max(1, ...leads.filter(isNum));
  const barW = Math.max(4, Math.min(18, ((W - padL - padR) / weeks.length) * 0.5));
  // Inset by half a bar so the first/last bars don't touch the axis labels
  const step = (W - padL - padR - barW) / (weeks.length - 1);
  const x = (i: number) => padL + barW / 2 + i * step;
  const y = (v: number) => lineTop + lineH - (v / maxCpl) * lineH;

  const points = cpls
    .map((v, i) => (isNum(v) ? `${x(i).toFixed(1)},${y(v).toFixed(1)}` : null))
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 520, display: "block" }} role="img" aria-label="Weekly cost per lead and leads">
        <line x1={padL} x2={W - padR} y1={y(ceiling)} y2={y(ceiling)} stroke={C.red} strokeDasharray="4 3" strokeWidth={1} />
        <text x={padL - 6} y={y(ceiling) + 3} fill={C.red} textAnchor="end" {...font}>
          £{Math.round(ceiling)}
        </text>
        <polyline points={points} fill="none" stroke={C.bright} strokeWidth={1.6} />
        {cpls.map((v, i) =>
          isNum(v) ? <circle key={i} cx={x(i)} cy={y(v)} r={2.2} fill={C.bright} /> : null
        )}
        {leads.map((v, i) =>
          isNum(v) ? (
            <rect
              key={i}
              x={x(i) - barW / 2}
              y={barsTop + barsH - (v / maxLeads) * barsH}
              width={barW}
              height={(v / maxLeads) * barsH}
              fill={`${C.primary}99`}
            />
          ) : null
        )}
        <text x={padL - 6} y={barsTop + barsH} fill={C.textLow} textAnchor="end" {...font}>
          leads
        </text>
        <text x={x(0) - barW / 2} y={H - 2} fill={C.textLow} textAnchor="start" {...font}>
          {fmtDate(weeks[0].week_ending, false)}
        </text>
        <text x={x(weeks.length - 1) + barW / 2} y={H - 2} fill={C.textLow} textAnchor="end" {...font}>
          {fmtDate(weeks[weeks.length - 1].week_ending, false)}
        </text>
      </svg>
      <div className="mono" style={{ fontSize: 8, color: C.textLow, letterSpacing: "0.1em", marginTop: 4 }}>
        <span style={{ color: C.bright }}>━</span> COST PER LEAD · <span style={{ color: C.red }}>┄</span> CEILING ·{" "}
        <span style={{ color: C.primary }}>▮</span> WEEKLY LEADS
      </div>
    </div>
  );
}

// The situations the Friday check matched (stayful-ads scaling/SITUATIONS.md),
// strongest first as written. Hidden when the snapshot has no diagnosis.
function Situations({ diagnosis }: { diagnosis: SnapshotDiagnosis | null }) {
  const matches = (diagnosis?.situations ?? []).filter((s) => s.id);
  const fresh = diagnosis?.new_situation;
  if (matches.length === 0 && !fresh) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
      {matches.map((s, i) => (
        <div key={`${s.id}-${i}`} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Chip colour={s.fit === "strong" ? C.cyan : C.textMid}>
            {[s.id, s.fit].filter(Boolean).join(" · ").toUpperCase()}
          </Chip>
          {s.evidence && (
            <span className="raj" style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.45 }}>
              {s.evidence}
            </span>
          )}
        </div>
      ))}
      {fresh && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Chip colour={C.amber}>NEW SITUATION</Chip>
          <span className="raj" style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.45 }}>
            {fresh}
          </span>
        </div>
      )}
    </div>
  );
}

const learningLabel = (c: SnapshotCampaign) =>
  c.learning_status ? `${c.learning_status}${c.learning_source === "estimated" ? " (est.)" : ""}` : "—";

// Campaigns grouped by lane, then each open A/B test with its versions side by
// side (control first). Retargeting's warm audiences show while it isn't live.
function Lanes({ campaigns, audiences }: { campaigns: SnapshotCampaign[]; audiences: SnapshotAudience[] }) {
  const groups = campaignsByLane(campaigns);
  const tests = openAbTests(campaigns);
  const retargetingLive = groups.some((g) => g.lane === "retargeting");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map((g) => (
        <div key={g.lane}>
          <Label>{g.label}</Label>
          <Table
            head={["CAMPAIGN", "BUDGET", "SPEND", "LEADS", "CPL", "LEARNING"]}
            rows={g.campaigns.map((c) => [
              `${c.name ?? c.id ?? "—"}${c.kept_running ? " (kept running)" : ""}`,
              gbpDaily(c.daily_budget_gbp),
              gbp(c.spend_gbp),
              count(c.leads),
              gbp(c.cost_per_lead_gbp),
              learningLabel(c),
            ])}
          />
        </div>
      ))}
      {tests.map(({ campaign, test, versions }, i) => (
        <div key={test.test_id ?? campaign.id ?? i}>
          <Label>A/B TEST · {campaign.name ?? "—"}</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <Chip colour={C.cyan}>{(test.status ?? "—").toUpperCase()}</Chip>
            {test.verdict && <Chip colour={C.bright}>{test.verdict.toUpperCase()}</Chip>}
            {test.variable && <Chip colour={C.textMid}>{test.variable.toUpperCase()}</Chip>}
            {test.ends && <Chip colour={C.textMid}>ENDS {fmtDate(test.ends, false).toUpperCase()}</Chip>}
          </div>
          <Table
            head={["", ...versions.map((v) => `${v.name ?? "—"}${v.control ? " (control)" : ""}`)]}
            rows={[
              ["SPEND", ...versions.map((v) => gbp(v.spend_gbp))],
              ["LEADS", ...versions.map((v) => count(v.leads))],
              ["COST PER LEAD", ...versions.map((v) => gbp(v.cost_per_lead_gbp))],
              ["QUALITY FAIL", ...versions.map((v) => pct(v.quality_fail_pct))],
            ]}
          />
        </div>
      ))}
      {!retargetingLive && audiences.length > 0 && (
        <Muted>
          Retargeting not live yet. Warm audiences:{" "}
          {audiences.map((a) => `${a.name ?? "—"} ${warmAudienceSize(a)}`).join("; ")}.
        </Muted>
      )}
    </div>
  );
}

function AdSetsTable({ adSets }: { adSets: SnapshotAdSet[] }) {
  if (adSets.length === 0) return <Muted>No ad sets in this snapshot.</Muted>;
  return (
    <Table
      head={["AD SET", "STATUS", "SPEND", "LEADS", "CPL"]}
      rows={adSets.map((s) => [s.name ?? "—", s.status ?? "—", gbp(s.spend_gbp), count(s.leads), gbp(s.cost_per_lead_gbp)])}
    />
  );
}

function AdVerdictsTable({ ads }: { ads: SnapshotAd[] }) {
  if (ads.length === 0) return <Muted>No ad verdicts in this snapshot yet.</Muted>;
  return (
    <Table
      head={["CONCEPT", "AD SET", "VERDICT", "CPL", "REASON"]}
      rows={ads.map((a) => [
        [a.concept_id, a.concept_name].filter(Boolean).join(" · ") || "—",
        a.ad_set ?? "—",
        a.verdict ?? "—",
        gbp(a.cost_per_lead_gbp),
        a.reason ?? "—",
      ])}
    />
  );
}

// ─── Jarvis: lead-database capacity ───────────────────────────────────────────
//
// The snapshot's capacity block, as written by the Friday check. Labels only:
// every figure is shown as-is, "—" when missing.

// `plain` is the bottleneck said in plain words (the prompt's wording);
// `label` names the stage in the list.
const STAGE_WORDS: Record<CapacityStageId, { label: string; plain: string }> = {
  area_match: { label: "Area match", plain: "Leads landing where no buyer covers" },
  buyer_capacity: { label: "Buyer capacity", plain: "Buyers are full: leads we can't sell" },
  landlord_supply: { label: "Landlord supply", plain: "Buyers owed more leads than we produce" },
  meeting_capacity: { label: "Meeting capacity", plain: "Your diary" },
  buyer_enquiries: { label: "Buyer enquiries", plain: "Not enough buyer enquiries" },
  booking_rate: { label: "Booking rate", plain: "Booking rate" },
  attendance: { label: "Attendance", plain: "Attendance" },
  close_rate: { label: "Close rate", plain: "Close rate" },
  churn: { label: "Churn", plain: "Buyers cancelling" },
};

const stageWords = (stage: string | null | undefined) =>
  stage ? STAGE_WORDS[stage as CapacityStageId] ?? { label: stage, plain: stage } : null;

const STATUS_COLOUR: Record<CapacityStageStatus, string> = {
  ok: C.bright,
  watch: C.amber,
  bottleneck: C.red,
};

const pct = (n: number | null | undefined) => (isNum(n) ? `${n.toLocaleString("en-GB")}%` : "—");

const signed = (n: number | null | undefined) =>
  isNum(n) ? (n > 0 ? `+${count(n)}` : n < 0 ? `−${count(-n)}` : "0") : "—";

/** low_sample names a rate by its field ("booking_rate_pct") or its stage
 *  ("booking_rate"); accept either. */
function isLowSample(lowSample: string[] | null | undefined, ...names: string[]): boolean {
  const flagged = new Set((lowSample ?? []).map((s) => s.toLowerCase().replace(/_pct$/, "")));
  return names.some((n) => flagged.has(n));
}

function CapacityPanel({ capacity, asOf }: { capacity: SnapshotCapacity | null; asOf: string | null | undefined }) {
  if (!capacity) {
    return <Muted>The Friday check hasn&rsquo;t measured capacity yet.</Muted>;
  }
  const supply = capacity.supply ?? {};
  const demand = capacity.demand ?? {};
  const ceiling = capacity.ceiling ?? {};
  const pipeline = capacity.pipeline ?? {};
  const bottleneck = capacity.bottleneck ?? {};
  const stages = capacity.stages ?? [];
  const words = stageWords(bottleneck.stage);

  const rates: Array<[string, number | null | undefined, boolean]> = [
    ["BOOKING", pipeline.booking_rate_pct, isLowSample(pipeline.low_sample, "booking_rate")],
    ["ATTENDANCE", pipeline.attendance_rate_pct, isLowSample(pipeline.low_sample, "attendance_rate", "attendance")],
    ["CLOSE", pipeline.close_rate_pct, isLowSample(pipeline.low_sample, "close_rate")],
  ];

  return (
    <div>
      <div className="mono" style={{ fontSize: 9, color: C.textMid, letterSpacing: "0.1em", marginBottom: 8 }}>
        AS OF {fmtDate(asOf).toUpperCase()}
        {isNum(capacity.window_days) ? ` · ${capacity.window_days}-DAY WINDOW` : ""}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Chip colour={words ? C.red : C.textMid}>{words ? words.plain.toUpperCase() : "NO BOTTLENECK NAMED"}</Chip>
        {bottleneck.headline && (
          <span className="raj" style={{ fontSize: 13, color: C.text }}>
            {bottleneck.headline}
          </span>
        )}
      </div>
      {bottleneck.action && <Para>{bottleneck.action}</Para>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 12 }}>
        <Tile
          value={`${count(demand.customers_unpaused)} / ${count(demand.customers_total)}`}
          label="CUSTOMERS UNPAUSED / TOTAL"
          sub={`CEILING ${count(ceiling.ceiling_next)} NEXT MONTH`}
        />
        <Tile
          value={count(supply.leads_month)}
          label="LANDLORD LEADS A MONTH"
          sub={`${count(supply.sales_per_lead)} SALES PER LEAD`}
        />
        <Tile
          value={count(demand.credits_owed)}
          label="CREDITS OWED"
          sub={`${signed(demand.credits_owed_change)} THIS WEEK`}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <Label>WHAT IT TAKES</Label>
      </div>
      <div className="raj" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 8px", fontSize: 13, color: C.text }}>
        <span>{count(pipeline.new_customers_needed)} new customers</span>
        <Arrow />
        <span>
          {count(pipeline.meetings_needed)} meetings{" "}
          <span style={{ color: C.textMid }}>(of {count(pipeline.meeting_capacity_month)})</span>
        </span>
        <Arrow />
        <span>{count(pipeline.bookings_needed)} bookings</span>
        <Arrow />
        <span>
          {count(pipeline.buyer_enquiries_needed)} buyer enquiries{" "}
          <span style={{ color: C.textMid }}>vs {count(pipeline.buyer_enquiries_actual)} actual</span>
        </span>
      </div>
      <div className="mono" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 9, color: C.textMid, letterSpacing: "0.1em", marginTop: 6 }}>
        {rates.map(([label, value, low]) => (
          <span key={label}>
            {label} {pct(value)}
            {low && <span style={{ color: C.amber }}> · SMALL SAMPLE</span>}
          </span>
        ))}
      </div>

      {stages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
          {stages.map((s, i) => {
            const colour = (s.status && STATUS_COLOUR[s.status]) || C.textLow;
            return (
              <div key={`${s.stage ?? "stage"}-${i}`} className="raj" style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5, lineHeight: 1.4 }}>
                <span title={s.status ?? "unknown"} style={{ width: 7, height: 7, borderRadius: "50%", background: colour, flexShrink: 0, transform: "translateY(-1px)" }} />
                <span style={{ color: C.text, minWidth: 110 }}>{stageWords(s.stage)?.label ?? "—"}</span>
                <span className="mono" style={{ fontSize: 10, color: colour, minWidth: 40 }}>
                  {s.value === null || s.value === undefined || s.value === "" ? "—" : typeof s.value === "number" ? count(s.value) : s.value}
                </span>
                <span style={{ color: C.textMid, fontWeight: 300 }}>{s.reason ?? ""}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tile({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", minWidth: 0 }}>
      <div className="orb" style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
        {value}
      </div>
      <div className="mono" style={{ fontSize: 8, color: C.textLow, letterSpacing: "0.12em", marginTop: 2 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 8, color: C.textMid, letterSpacing: "0.1em", marginTop: 2 }}>
        {sub}
      </div>
    </div>
  );
}

function Arrow() {
  return <span style={{ color: C.primary }}>→</span>;
}

// ─── Janet: creative ──────────────────────────────────────────────────────────

interface PipelineBrief {
  brief_id: string;
  angle_id: string;
  format: string;
  status: string;
  needed_by: string;
}

function JanetPanel({ data, snapshot }: { data: DepartmentData; snapshot: WeeklySnapshot }) {
  const creative = snapshot.creative ?? null;
  const janet = DIRECTORS.janet.colour;

  // The queue file is the source; the snapshot's creative.briefs is the
  // fallback when the queue can't be read.
  const briefs: PipelineBrief[] | null =
    data.briefs ??
    creative?.briefs?.map((b) => ({
      brief_id: b.brief_id ?? "",
      angle_id: b.angle_id ?? "",
      format: b.format ?? "",
      status: b.status ?? "",
      needed_by: b.needed_by ?? "",
    })) ??
    null;

  const conceptNames = new Map((data.register ?? []).map((r: RegisterRow) => [r.concept_id, r.concept]));
  const ready = creative?.ready_to_upload ?? [];
  const waiting = creative?.waiting_on_zac ?? [];

  return (
    <Panel director="janet" title="CREATIVE">
      <Label>RESERVE</Label>
      {creative && isNum(creative.reserve_count) ? (
        <Reserve have={creative.reserve_count} need={creative.reserve_needed} colour={janet} />
      ) : (
        <Muted>The creative block isn&rsquo;t in this week&rsquo;s snapshot yet.</Muted>
      )}

      <Block title="BRIEF PIPELINE" colour={janet}>
        {briefs === null ? (
          <Muted>The brief queue isn&rsquo;t available yet.</Muted>
        ) : (
          <BriefPipeline briefs={briefs} colour={janet} />
        )}
      </Block>

      <Block title="READY TO UPLOAD" colour={janet}>
        {!creative ? (
          <Muted>Not in this week&rsquo;s snapshot yet.</Muted>
        ) : ready.length === 0 ? (
          <Muted>Nothing ready to upload.</Muted>
        ) : (
          <BulletList
            items={ready.map((id) => (conceptNames.get(id) ? `${id} · ${conceptNames.get(id)}` : id))}
            colour={janet}
          />
        )}
      </Block>

      <Block title="WAITING ON YOU" colour={janet}>
        {!creative ? (
          <Muted>Not in this week&rsquo;s snapshot yet.</Muted>
        ) : waiting.length === 0 ? (
          <Muted>Nothing waiting on you.</Muted>
        ) : (
          <BulletList items={waiting} colour={janet} />
        )}
      </Block>

      {data.angleCoverage && (
        <Block title="ANGLE COVERAGE" colour={janet}>
          <AngleCoverageCard coverage={data.angleCoverage} colour={janet} />
        </Block>
      )}
    </Panel>
  );
}

function Reserve({ have, need, colour }: { have: number; need: number | null | undefined; colour: string }) {
  const short = isNum(need) && have < need;
  return (
    <div>
      <div className="orb" style={{ fontSize: 22, fontWeight: 700, color: short ? C.amber : colour }}>
        {have}
        <span className="raj" style={{ fontSize: 13, fontWeight: 400, color: C.textMid }}>
          {" "}
          of {isNum(need) ? need : "—"} ads in reserve
        </span>
      </div>
      {isNum(need) && need > 0 && (
        <div style={{ height: 6, marginTop: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3 }}>
          <div
            style={{
              width: `${Math.min(100, (have / need) * 100)}%`,
              height: "100%",
              background: short ? `${C.amber}aa` : `${colour}aa`,
              borderRadius: 3,
            }}
          />
        </div>
      )}
    </div>
  );
}

function BriefPipeline({ briefs, colour }: { briefs: PipelineBrief[]; colour: string }) {
  const stageOf = (b: PipelineBrief) => normaliseStage(b.status);
  const known = new Set(PIPELINE_STAGES.map((s) => s.toLowerCase()));
  const groups: Array<{ stage: string; items: PipelineBrief[] }> = PIPELINE_STAGES.map((stage) => ({
    stage,
    items: briefs.filter((b) => stageOf(b) === stage.toLowerCase()),
  }));
  const other = briefs.filter((b) => !known.has(stageOf(b)) && !CLOSED_STAGES.has(stageOf(b)));
  if (other.length > 0) groups.push({ stage: "Other", items: other });

  if (briefs.every((b) => CLOSED_STAGES.has(stageOf(b)))) {
    return <Muted>No open briefs in the queue.</Muted>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {groups.map(({ stage, items }) => (
        <div key={stage}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: items.length ? colour : C.textLow }}>
            {stage.toUpperCase()} · {items.length}
          </div>
          {items.map((b) => (
            <div
              key={`${stage}-${b.brief_id}`}
              className="raj"
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "baseline",
                fontSize: 13,
                color: C.text,
                padding: "3px 0 3px 10px",
                borderLeft: `2px solid ${colour}55`,
                marginTop: 3,
              }}
            >
              <span className="mono" style={{ fontSize: 10, color: colour }}>
                {b.brief_id || "—"}
              </span>
              <span>Angle {b.angle_id || "—"}</span>
              {b.format && <span style={{ color: C.textMid }}>{b.format}</span>}
              {b.needed_by && <span style={{ color: C.textMid }}>· needed by {fmtDate(b.needed_by, false)}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AngleCoverageCard({ coverage, colour }: { coverage: AngleCoverage; colour: string }) {
  const cells: Array<[string, number, string]> = [
    ["BUILT", coverage.built, colour],
    ["IN PROGRESS", coverage.inProgress, C.amber],
    ["OPEN", coverage.open, C.textMid],
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {cells.map(([label, value, c]) => (
          <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px" }}>
            <div className="orb" style={{ fontSize: 18, fontWeight: 700, color: c }}>
              {value}
            </div>
            <div className="mono" style={{ fontSize: 8, color: C.textLow, letterSpacing: "0.12em", marginTop: 2 }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      <div className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.08em", marginTop: 6 }}>
        OF {coverage.total} ANGLES IN ANGLES.MD
      </div>
    </div>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Panel({ director, title, children }: { director: Director; title: string; children: ReactNode }) {
  const { label, colour } = DIRECTORS[director];
  return (
    <section
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderTop: `2px solid ${colour}`,
        borderRadius: 6,
        padding: 16,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: colour }} />
        <span className="orb" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", color: colour }}>
          {label}
        </span>
        <span className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.14em" }}>
          · {title}
        </span>
      </div>
      {children}
    </section>
  );
}

function Block({ title, colour, children }: { title: string; colour: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.16em", color: colour, marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.14em", marginBottom: 4 }}>
      {children}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.14em" }}>
        {label}
      </div>
      <div className="orb" style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: C.text }}>
        {value}
      </div>
    </div>
  );
}

function Chip({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        letterSpacing: "0.14em",
        color: colour,
        border: `1px solid ${colour}88`,
        background: `${colour}18`,
        padding: "3px 8px",
        borderRadius: 3,
      }}
    >
      {children}
    </span>
  );
}

function Para({ children }: { children: ReactNode }) {
  return (
    <p className="raj" style={{ fontSize: 13, color: C.textMid, lineHeight: 1.55, fontWeight: 300, marginTop: 8 }}>
      {children}
    </p>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <p className="raj" style={{ fontSize: 12.5, color: C.textLow, lineHeight: 1.5, fontStyle: "italic" }}>
      {children}
    </p>
  );
}

function BulletList({ items, colour }: { items: string[]; colour: string }) {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} className="raj" style={{ display: "flex", gap: 8, fontSize: 13, color: C.text, lineHeight: 1.45, fontWeight: 300 }}>
          <span style={{ color: colour, flexShrink: 0 }}>▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="mkt-table">
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

function Notice({ tone, title, children }: { tone: "warn" | "error"; title: string; children: ReactNode }) {
  const colour = tone === "error" ? C.red : C.amber;
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

// Layout: chat column left on desktop; on phones the panels come first and
// the chat follows underneath, all in one scroll.
const SHELL_CSS = `
  .mkt-shell { flex: 1; display: flex; min-height: 0; overflow: hidden; }
  .mkt-chat {
    width: 280px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
    border-right: 1px solid ${C.border}; padding-top: 14px; overflow: hidden;
  }
  .mkt-feed { flex: 1; overflow-y: auto; width: 100%; padding: 10px 14px 8px; }
  .mkt-main { flex: 1; min-width: 0; overflow-y: auto; padding: 18px 52px 28px 20px; color: ${C.text}; }
  .mkt-panels {
    display: grid; gap: 16px; align-items: start;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  }
  .mkt-table { width: 100%; border-collapse: collapse; font-family: 'Rajdhani', sans-serif; font-size: 12.5px; }
  .mkt-table th {
    text-align: left; font-family: 'Share Tech Mono', monospace; font-size: 8.5px; font-weight: 400;
    letter-spacing: 0.12em; color: ${C.textLow}; padding: 0 8px 6px 0; white-space: nowrap;
  }
  .mkt-table td { color: ${C.text}; padding: 5px 8px 5px 0; border-top: 1px solid ${C.border}; vertical-align: top; }
  @media (max-width: 760px) {
    .mkt-shell { flex-direction: column; overflow-y: auto; }
    .mkt-main { flex: none; overflow: visible; padding: 14px 48px 16px 14px; }
    .mkt-chat {
      order: 1; width: 100%; border-right: none; border-top: 1px solid ${C.border};
      padding-top: 0; overflow: visible;
    }
    .mkt-eye { display: none; }
    .mkt-feed { overflow: visible; padding: 12px 48px 12px 14px; }
  }
`;
