"use client";

// Lead-database retention dashboard. Mounted by app/page.tsx when
// routedView === "retention-dashboard"; JARVIS's view (no chat column — the
// shell's feed stays beside it like the other dashboards).
//
// Data comes from /api/retention: the Monday enquiries board (funnel) joined
// on email with the lead-database app's read-only retention feed (churn).
// Every number is rendered as computed server-side; anything missing shows
// "—". When the lead-database feed is not connected the churn tiles say
// "approximate" and come from the board's own labels.

import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/jarvis-design";
import { monthLabel, rangeForPreset } from "@/lib/retention/dates";
import type {
  CustomerRow,
  LeadDbProduct,
  RangePreset,
  RetentionDashboardData,
} from "@/lib/retention/types";
import { Bar, Chip, Kpi, Label, Muted, Notice, Panel, PANELS_CSS, Table } from "@/components/views/panels";

interface Props {
  onLoaded?: (data: RetentionDashboardData | null) => void;
}

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: "7d", label: "7 DAYS" },
  { id: "30d", label: "30 DAYS" },
  { id: "90d", label: "90 DAYS" },
  { id: "all", label: "ALL TIME" },
];

// ─── Formatting ───────────────────────────────────────────────────────────────

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const count = (n: number | null | undefined) => (isNum(n) ? n.toLocaleString("en-GB") : "—");
const pctStr = (n: number | null | undefined) => (isNum(n) ? `${Math.round(n)}%` : "—");
const shareStr = (n: number | null | undefined) => (isNum(n) ? `${Math.round(n * 100)}%` : "—");
const gbp = (pence: number | null | undefined) => (isNum(pence) ? `£${Math.round(pence / 100).toLocaleString("en-GB")}` : "—");

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
}

function stateColour(row: CustomerRow): string {
  const s = row.leadDbState ?? row.mondayStatus ?? "";
  if (/cancelled|lapsed/i.test(s)) return C.red;
  if (/cancelling|paused|declined/i.test(s)) return C.amber;
  if (/active|customer/i.test(s)) return C.bright;
  return C.textLow;
}

const productLabel = (p: CustomerRow["product"]) => (p === "guaranteed_rent" ? "GR" : p === "management" ? "Mgmt" : "—");

// ─── Main view ────────────────────────────────────────────────────────────────

export default function RetentionDashboardView({ onLoaded }: Props) {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [data, setData] = useState<RetentionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    const range = rangeForPreset(preset);
    setLoading(true);
    fetch(`/api/retention?from=${range.from}&to=${range.to}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as RetentionDashboardData | null;
        if (cancelled) return;
        if (body && Array.isArray(body.errors)) {
          setData(body);
          setLoadError(null);
          onLoadedRef.current?.(body.funnel ? body : null);
        } else {
          setLoadError(`The retention route returned HTTP ${res.status}.`);
          onLoadedRef.current?.(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Network error.");
        onLoadedRef.current?.(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preset]);

  const funnel = data?.funnel ?? null;
  const leadDb = data?.leadDbStatus === "ok" ? data.leadDb : null;

  return (
    <div className="ret-shell">
      <style>{PANELS_CSS + SHELL_CSS}</style>

      <header className="ret-head">
        <div>
          <div className="orb" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.26em", color: C.bright }}>
            LEAD DATABASE · RETENTION
          </div>
          <div className="mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.14em", marginTop: 4 }}>
            MONDAY ENQUIRIES BOARD + LEAD-DATABASE FEED
            {data?.history.from ? ` · STATUS HISTORY FROM ${fmtDate(data.history.from).toUpperCase()}` : ""}
            {data?.generatedAt ? ` · AS OF ${new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <Chip key={p.id} colour={preset === p.id ? C.bright : C.textMid} active={preset === p.id} onClick={() => setPreset(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </header>

      {loadError ? (
        <Notice tone="error" title="RETENTION DATA UNAVAILABLE">
          {loadError}
        </Notice>
      ) : !data && loading ? (
        <div className="mono" style={{ fontSize: 10, color: C.textLow, letterSpacing: "0.14em" }}>
          READING THE ENQUIRIES BOARD…
        </div>
      ) : !data || !funnel ? (
        <Notice tone="error" title="RETENTION DATA UNAVAILABLE">
          {data?.errors.length ? data.errors.join(" · ") : "The enquiries board could not be read."}
        </Notice>
      ) : (
        <>
          {data.leadDbStatus !== "ok" && (
            <Notice tone={data.leadDbStatus === "not_configured" ? "info" : "warn"} title="CHURN IS APPROXIMATE — LEAD-DATABASE FEED NOT CONNECTED">
              {data.errors.find((e) => /lead database|LEAD_DATABASE/i.test(e)) ??
                "Churn below comes from the board's own labels. Connect the lead-database feed for tenure, invoices and reasons."}
            </Notice>
          )}
          {data.errors.filter((e) => !/lead database|LEAD_DATABASE/i.test(e)).length > 0 && (
            <Notice tone="warn" title="SOME DATA COULDN'T BE READ">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {data.errors
                  .filter((e) => !/lead database|LEAD_DATABASE/i.test(e))
                  .map((e) => (
                    <li key={e}>{e}</li>
                  ))}
              </ul>
            </Notice>
          )}

          <div className="jv-grid" style={{ opacity: loading ? 0.6 : 1, transition: "opacity 160ms" }}>
            <PeriodPanel data={data} />
            <FunnelPanel data={data} />
            <CustomersPanel data={data} />
            <RetentionPanel products={leadDb?.products ?? null} status={data.leadDbStatus} />
            <MonthsPanel data={data} />
            <EveryCustomerPanel rows={data.customers} hasLeadDb={!!leadDb} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────

function PeriodPanel({ data }: { data: RetentionDashboardData }) {
  const p = data.funnel!.period;
  const t = data.funnel!.totals;
  return (
    <Panel title="THIS PERIOD" accent={C.bright} right={<span className="mono" style={{ fontSize: 9, color: C.textLow }}>{fmtDate(data.range.from)} – {fmtDate(data.range.to)}</span>}>
      <div className="jv-kpis">
        <Kpi label="NEW ENQUIRIES" value={count(p.newLeads)} />
        <Kpi label="MEETINGS BOOKED" value={count(p.meetingsBooked)} />
        <Kpi label="MEETINGS SAT" value={count(p.meetingsSat)} />
        <Kpi label="NO-SHOWS" value={count(p.noShows)} tone={p.noShows ? C.amber : undefined} />
        <Kpi label="NEW CUSTOMERS" value={count(p.newCustomers)} tone={C.bright} />
        <Kpi label="TOTAL ENQUIRIES" value={count(t.totalLeads)} sub="all time" />
      </div>
    </Panel>
  );
}

function FunnelPanel({ data }: { data: RetentionDashboardData }) {
  const { totals: t, rates: r } = data.funnel!;
  return (
    <Panel title="FUNNEL · ALL TIME" accent={C.cyan}>
      <Bar label="Enquiries" value={t.totalLeads} max={t.totalLeads} colour={C.dim} />
      <Bar label="Booked a web meeting" value={t.everBooked} max={t.totalLeads} colour={C.cyan} note={`${pctStr(r.enquiryToMeeting)} of enquiries`} />
      <Bar label="Sat the meeting" value={t.everSat} max={t.totalLeads} colour={C.primary} note={`${pctStr(r.attendance)} attendance`} />
      <Bar label="Became customers" value={t.customersEver} max={t.totalLeads} colour={C.bright} note={`${pctStr(r.meetingToCustomer)} of those who sat`} />
      <div className="jv-kpis" style={{ marginTop: 14 }}>
        <Kpi label="MEETING → CUSTOMER" value={pctStr(r.meetingToCustomer)} tone={C.bright} />
        <Kpi label="ENQUIRY → CUSTOMER" value={pctStr(r.enquiryToCustomer)} />
        <Kpi label="NO-SHOWS EVER" value={count(t.everNoShow)} />
      </div>
      {t.assumedSatCount > 0 && (
        <Muted>
          {t.assumedSatCount} customer{t.assumedSatCount === 1 ? "" : "s"} predate the board&rsquo;s status history and are assumed to have sat a meeting.
        </Muted>
      )}
    </Panel>
  );
}

function CustomersPanel({ data }: { data: RetentionDashboardData }) {
  const c = data.funnel!.customers;
  const t = data.funnel!.totals;
  const leadDb = data.leadDbStatus === "ok" ? data.leadDb : null;
  const churned = leadDb?.products.reduce((n, p) => n + p.churned, 0) ?? null;
  const paying = leadDb?.products.reduce((n, p) => n + p.payingEver, 0) ?? null;
  const mrr = leadDb?.products.reduce((n, p) => n + p.mrr.totalPence, 0) ?? null;
  const pausedMrr = leadDb?.products.reduce((n, p) => n + p.mrr.pausedPence, 0) ?? null;
  const stable = leadDb?.products.reduce((n, p) => n + p.mrr.stablePence, 0) ?? null;
  return (
    <Panel title="CUSTOMERS" accent={C.gold} right={leadDb ? undefined : <Chip colour={C.amber}>APPROXIMATE</Chip>}>
      <div className="jv-kpis">
        <Kpi label="ACTIVE" value={count(c.active)} sub={`${c.activeManagement} management · ${c.activeGuaranteedRent} guaranteed rent`} tone={C.bright} />
        <Kpi label="PAUSED" value={count(c.paused)} tone={c.paused ? C.amber : undefined} />
        <Kpi label="CANCELLING" value={count(c.cancelling)} tone={c.cancelling ? C.amber : undefined} />
        <Kpi label="CANCELLED" value={count(c.cancelled)} tone={c.cancelled ? C.red : undefined} />
        <Kpi label="CARD DECLINED" value={count(c.cardDeclined)} />
        <Kpi label="CUSTOMERS EVER" value={count(t.customersEver)} />
      </div>
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        {leadDb && churned !== null && paying !== null ? (
          <div className="jv-kpis">
            <Kpi label="CHURN" value={paying > 0 ? pctStr((churned / paying) * 100) : "—"} sub={`${churned} of ${paying} paying customers have left`} tone={C.red} />
            <Kpi label="MRR IN FORCE" value={gbp(mrr)} sub={pausedMrr ? `${gbp(pausedMrr)} paused, not billing` : undefined} />
            <Kpi label="STABLE SHARE" value={mrr ? shareStr((stable ?? 0) / mrr) : "—"} sub="revenue from 6-month-plus tenure" />
          </div>
        ) : (
          <div className="jv-kpis">
            <Kpi label="CHURN (BOARD)" value={pctStr(c.approxChurnPct)} sub={`${c.cancelled} cancelled of ${t.customersEver} customers ever`} tone={C.red} />
          </div>
        )}
      </div>
    </Panel>
  );
}

function RetentionPanel({ products, status }: { products: LeadDbProduct[] | null; status: RetentionDashboardData["leadDbStatus"] }) {
  return (
    <Panel title="RETENTION BY TENURE" accent={C.primary}>
      {!products ? (
        <Muted>
          {status === "not_configured"
            ? "Needs the lead-database feed: set LEAD_DATABASE_INTERNAL_SECRET here and JARVIS_INTERNAL_SECRET on leads.stayful.co.uk."
            : "The lead-database feed didn't answer. Tenure retention needs its invoice history."}
        </Muted>
      ) : (
        products.map((p) => (
          <div key={p.leadType} style={{ marginBottom: 14 }}>
            <Label>
              {p.label.toUpperCase()} · {p.payingEver} PAYING EVER · CHURN {pctStr(p.churnRatePct)}
              {p.churnedNeverPaid ? ` · ${p.churnedNeverPaid} LEFT BEFORE PAYING` : ""}
            </Label>
            <Table
              head={["CHECKPOINT", "RENEWED", "RATE", "UNCLEAR", "PAUSED"]}
              rows={p.retention.map((c) =>
                c.eligible > 0
                  ? [
                      c.label,
                      <span key="r" className="num">{c.renewed} of {c.eligible}</span>,
                      c.pct !== null ? shareStr(c.pct) : <span style={{ color: C.textLow }}>withheld (&lt;5)</span>,
                      count(c.unclear),
                      count(c.paused),
                    ]
                  : [c.label, <span key="m" style={{ color: C.textLow }}>measurable from {fmtDate(c.measurableFrom)}</span>, "—", "—", "—"]
              )}
            />
            {p.reasons.length > 0 && (
              <div className="raj" style={{ fontSize: 12, color: C.textMid, marginTop: 8, lineHeight: 1.5 }}>
                Reasons: {p.reasons.map((r) => `${r.label} ${r.count}`).join(" · ")}
              </div>
            )}
          </div>
        ))
      )}
    </Panel>
  );
}

function MonthsPanel({ data }: { data: RetentionDashboardData }) {
  const months = data.funnel!.totals.enquiriesByMonth;
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <Panel title="ENQUIRIES BY MONTH" accent={C.textMid}>
      {months.length === 0 ? <Muted>No enquiry dates on the board.</Muted> : months.map((m) => <Bar key={m.month} label={monthLabel(m.month)} value={m.count} max={max} colour={C.primary} />)}
    </Panel>
  );
}

function EveryCustomerPanel({ rows, hasLeadDb }: { rows: CustomerRow[]; hasLeadDb: boolean }) {
  return (
    <Panel title="EVERY CUSTOMER" accent={C.gold} wide right={<span className="mono" style={{ fontSize: 9, color: C.textLow }}>{rows.length} ROWS · {hasLeadDb ? "BOARD + LEAD DATABASE" : "BOARD ONLY"}</span>}>
      {rows.length === 0 ? (
        <Muted>No customers yet.</Muted>
      ) : (
        <Table
          head={["CUSTOMER", "PRODUCT", "STATE", "BOARD STATUS", "STARTED", "TENURE", "INVOICES", "MRR", "REASON"]}
          rows={rows.map((r) => [
            <span key="n">
              {r.name}
              {r.email ? <span className="mono" style={{ display: "block", fontSize: 9, color: C.textLow }}>{r.email}</span> : null}
            </span>,
            productLabel(r.product),
            <Chip key="s" colour={stateColour(r)}>{(r.leadDbStateLabel ?? r.mondayStatus ?? "unknown").toUpperCase()}</Chip>,
            r.mondayStatus ?? "—",
            fmtDate(r.firstPaidAt ?? r.mondayStart),
            <span key="t" className="num">{r.tenureMonths !== null ? `${r.tenureMonths} mo${r.tenureBasis === "signup_estimated" ? " (est.)" : ""}` : "—"}</span>,
            count(r.invoicesPaid),
            gbp(r.mrrPence),
            <span key="r">
              {r.reasonLabels.length ? r.reasonLabels.join(", ") : "—"}
              {r.reasonNote ? <span className="raj" style={{ display: "block", fontSize: 11.5, color: C.textMid }}>&ldquo;{r.reasonNote}&rdquo;</span> : null}
            </span>,
          ])}
        />
      )}
    </Panel>
  );
}

const SHELL_CSS = `
  .ret-shell { padding: 18px 52px 28px 20px; color: ${C.text}; }
  .ret-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  @media (max-width: 760px) {
    .ret-shell { padding: 14px 48px 16px 14px; }
  }
`;
