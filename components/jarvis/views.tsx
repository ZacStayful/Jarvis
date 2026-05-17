"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Minus,
  Phone,
  Zap,
} from "lucide-react";
import { C } from "@/lib/jarvis-design";
import {
  MOCK_HOLDINGS,
  MOCK_INTELLIGENCE,
  MOCK_LEADS,
  MOCK_NEWS,
  MOCK_TASKS,
} from "@/lib/jarvis-mock-data";
import { Bubble } from "./Bubble";
import { MessageRenderer } from "@/components/MessageRenderer";
import type { Message } from "@/types/jarvis";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="orb"
      style={{
        fontSize: 9,
        letterSpacing: "0.22em",
        color: C.primary,
        marginBottom: 12,
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

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  alert?: boolean;
}

export function MetricCard({ label, value, sub, color = C.text, alert = false }: MetricCardProps) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${alert ? C.amber + "66" : C.border}`,
        borderRadius: 6,
        padding: "12px 14px",
        animation: alert ? "ringPulse 2.5s ease-in-out infinite" : "none",
        flex: 1,
      }}
    >
      <div className="orb" style={{ fontSize: 10, color: C.textLow, letterSpacing: "0.15em", marginBottom: 6 }}>
        {label}
      </div>
      <div className="orb" style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div className="raj" style={{ fontSize: 11, color: C.textLow, marginTop: 4, fontWeight: 300 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const viewWrap: React.CSSProperties = {
  padding: 20,
  overflowY: "auto",
  height: "100%",
  animation: "slideIn .35s ease",
};

export function CommandView() {
  return (
    <div style={viewWrap}>
      <SectionLabel>COMMAND CENTRE</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <MetricCard label="ACTIVE LEADS" value="24" sub="3 require action" color={C.bright} />
        <MetricCard label="TODAY'S MEETINGS" value="2" sub="Next: 14:30" color={C.cyan} />
        <MetricCard label="TASKS DUE" value="4" sub="1 overdue" color={C.amber} alert />
      </div>

      <SectionLabel>KEY DECISION</SectionLabel>
      <div
        style={{
          background: `${C.amber}12`,
          border: `1px solid ${C.amber}44`,
          borderRadius: 6,
          padding: "12px 14px",
          marginBottom: 18,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="raj" style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 4 }}>
            Review Lucy campaign results — 18 calls completed yesterday
          </div>
          <div className="raj" style={{ fontSize: 12, color: C.textMid, fontWeight: 300 }}>
            4 voicemails not returned. 2 qualified but not yet booked. Recommend triggering follow-up sequence.
          </div>
        </div>
      </div>

      <SectionLabel>PIPELINE SNAPSHOT</SectionLabel>
      <div style={{ marginBottom: 18 }}>
        {[
          { label: "New",        count: 8, w: 35 },
          { label: "Contacted",  count: 6, w: 28 },
          { label: "Qualified",  count: 5, w: 22 },
          { label: "Mtg Booked", count: 3, w: 16 },
          { label: "Proposal",   count: 2, w: 12 },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
            <div className="mono" style={{ fontSize: 9, color: C.textLow, width: 72, textAlign: "right", letterSpacing: ".08em" }}>
              {row.label}
            </div>
            <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  width: `${row.w}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${C.primary}, ${C.bright})`,
                }}
              />
            </div>
            <div className="orb" style={{ fontSize: 10, color: C.textMid, width: 16, textAlign: "right" }}>
              {row.count}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>RECENT ACTIVITY</SectionLabel>
      {[
        { text: "David Thornton — web meeting completed, intelligence logged",  time: "1h ago", dot: C.bright },
        { text: "Lucy completed 18-call campaign — South Yorkshire batch",      time: "3h ago", dot: C.cyan },
        { text: "Tom Aldridge — proposal sent (4 properties, £2,840/mo PMI)",   time: "5h ago", dot: C.primary },
      ].map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            marginBottom: 10,
            padding: "9px 12px",
            background: C.surfHi,
            border: `1px solid ${C.border}`,
            borderRadius: 5,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.dot, marginTop: 4, flexShrink: 0 }} />
          <div className="raj" style={{ fontSize: 12, color: C.textMid, fontWeight: 300, flex: 1 }}>
            {a.text}
          </div>
          <div className="mono" style={{ fontSize: 9, color: C.textLow, flexShrink: 0 }}>
            {a.time}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsView() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div style={viewWrap}>
      <SectionLabel>NEWS BRIEFING</SectionLabel>
      {MOCK_NEWS.map((item, i) => {
        const color = ({ amber: C.amber, red: C.red, green: C.bright } as const)[item.severity];
        const open = expanded === i;
        return (
          <div
            key={i}
            style={{
              marginBottom: 10,
              background: C.surface,
              border: `1px solid ${color}33`,
              borderRadius: 6,
              overflow: "hidden",
              cursor: "pointer",
              transition: "all .2s",
            }}
            onClick={() => setExpanded(open ? null : i)}
          >
            <div style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 3, alignSelf: "stretch", background: color, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span className="orb" style={{ fontSize: 8, color, letterSpacing: "0.18em" }}>
                    {item.category}
                  </span>
                  <span className="mono" style={{ fontSize: 9, color: C.textLow }}>
                    {item.time}
                  </span>
                </div>
                <div className="raj" style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.4 }}>
                  {item.headline}
                </div>
              </div>
              <ChevronRight
                size={12}
                color={C.textLow}
                style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s", flexShrink: 0 }}
              />
            </div>
            {open && (
              <div style={{ padding: "0 14px 14px 26px", animation: "fadeUp .2s ease" }}>
                <div style={{ marginBottom: 10 }}>
                  <div className="orb" style={{ fontSize: 8, color: C.primary, letterSpacing: "0.15em", marginBottom: 5 }}>
                    STAYFUL IMPACT
                  </div>
                  <p className="raj" style={{ fontSize: 12, color: C.textMid, fontWeight: 300, lineHeight: 1.55 }}>
                    {item.stayfulImpact}
                  </p>
                </div>
                <div
                  style={{
                    background: `${color}12`,
                    border: `1px solid ${color}33`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <Zap size={10} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p className="raj" style={{ fontSize: 12, color: C.text, fontWeight: 400, lineHeight: 1.5 }}>
                    {item.action}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function InvestmentsView() {
  return (
    <div style={viewWrap}>
      <SectionLabel>INVESTMENT DASHBOARD</SectionLabel>
      <div style={{ marginBottom: 16 }}>
        {MOCK_HOLDINGS.map((h, i) => {
          const isUp = h.dir === "up";
          const isFl = h.dir === "flat";
          const chgColor = isUp ? C.bright : isFl ? C.textLow : C.red;
          const Icon = isUp ? ArrowUpRight : isFl ? Minus : ArrowDownRight;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                marginBottom: 6,
                borderRadius: 6,
                overflow: "hidden",
                border: `1px solid ${C.border}`,
                background: C.surface,
              }}
            >
              <div style={{ width: 4, background: `${chgColor}88`, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 42 }}>
                  <div className="orb" style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: "0.08em" }}>
                    {h.ticker}
                  </div>
                  <div className="raj" style={{ fontSize: 10, color: C.textLow, fontWeight: 300 }}>
                    {h.weight}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="raj" style={{ fontSize: 12, color: C.textMid, fontWeight: 300 }}>
                    {h.note}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                  <Icon size={11} color={chgColor} />
                  <span className="mono" style={{ fontSize: 10, color: chgColor }}>
                    {h.chg}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: `${C.gold}10`,
          border: `1px solid ${C.gold}33`,
          borderRadius: 6,
          padding: "12px 14px",
        }}
      >
        <div className="orb" style={{ fontSize: 9, color: C.gold, letterSpacing: "0.18em", marginBottom: 8 }}>
          JARVIS ADVISORY
        </div>
        <p className="raj" style={{ fontSize: 12, color: C.textMid, fontWeight: 300, lineHeight: 1.6 }}>
          Portfolio is overweight NVDA at 22%. Consider reducing 5% on the next significant rally. Cash reserve at 15% is well-positioned for a BoE cut signal — deploy into VUSA or add to NVDA. Lloyds warrants a 30-day review; rate compression thesis is building.
        </p>
      </div>
    </div>
  );
}

export function LeadsView() {
  const STAGE_COLORS: Record<string, string> = {
    New: "#3a5a38",
    Contacted: C.primary,
    Qualified: C.cyan,
    "Web meeting booked": C.gold,
    "Proposal sent": C.amber,
  };
  return (
    <div style={viewWrap}>
      <SectionLabel>LEADS & SALES PIPELINE</SectionLabel>
      <div style={{ marginBottom: 16 }}>
        {MOCK_LEADS.map((lead, i) => {
          const stageBg = STAGE_COLORS[lead.status] || C.primary;
          const flagColor = lead.flag === "high" ? C.bright : lead.flag === "mid" ? C.amber : C.textLow;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 7,
                padding: "10px 12px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
              }}
            >
              <div style={{ width: 3, alignSelf: "stretch", background: `${flagColor}88`, borderRadius: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span className="raj" style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                    {lead.name}
                  </span>
                  <span className="orb" style={{ fontSize: 9, color: stageBg, letterSpacing: "0.12em" }}>
                    {lead.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <span className="mono" style={{ fontSize: 9, color: C.textLow }}>{lead.location}</span>
                  <span className="mono" style={{ fontSize: 9, color: C.textLow }}>{lead.properties} PROP</span>
                  <span className="mono" style={{ fontSize: 9, color: flagColor }}>SCORE {lead.score}</span>
                </div>
              </div>
              <ChevronRight size={12} color={C.textLow} />
            </div>
          );
        })}
      </div>

      <SectionLabel>LUCY STATUS</SectionLabel>
      <div
        style={{
          background: `${C.cyan}0f`,
          border: `1px solid ${C.cyan}33`,
          borderRadius: 6,
          padding: "12px 14px",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Phone size={14} color={C.cyan} />
        <div>
          <div className="raj" style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
            Last campaign: 18 calls — 4 qualified, 2 meetings booked
          </div>
          <div className="raj" style={{ fontSize: 11, color: C.textLow, fontWeight: 300, marginTop: 2 }}>
            Conversion rate: 22.2% (vs. 18.8% baseline) — above average
          </div>
        </div>
      </div>
    </div>
  );
}

export function TasksView() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const toggle = (id: number) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const priorityColor: Record<string, string> = { high: C.red, mid: C.amber, low: C.textLow };

  return (
    <div style={viewWrap}>
      <SectionLabel>TASKS & TO-DOS</SectionLabel>
      {["Today", "Tomorrow", "This week", "Friday"].map((group) => {
        const items = tasks.filter((t) => t.due === group);
        if (!items.length) return null;
        return (
          <div key={group} style={{ marginBottom: 16 }}>
            <div
              className="raj"
              style={{
                fontSize: 11,
                color: C.textLow,
                fontWeight: 600,
                letterSpacing: "0.12em",
                marginBottom: 8,
                paddingLeft: 2,
              }}
            >
              {group.toUpperCase()}
            </div>
            {items.map((task) => (
              <div
                key={task.id}
                onClick={() => toggle(task.id)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 6,
                  padding: "9px 12px",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  cursor: "pointer",
                  opacity: task.done ? 0.45 : 1,
                  transition: "opacity .2s",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: `1.5px solid ${task.done ? C.primary : C.border}`,
                    background: task.done ? `${C.primary}44` : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all .2s",
                  }}
                >
                  {task.done && <div style={{ width: 6, height: 6, borderRadius: 1, background: C.bright }} />}
                </div>
                <span
                  className="raj"
                  style={{
                    fontSize: 12,
                    color: task.done ? C.textLow : C.text,
                    fontWeight: task.done ? 300 : 400,
                    flex: 1,
                    textDecoration: task.done ? "line-through" : "none",
                  }}
                >
                  {task.text}
                </span>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: priorityColor[task.priority],
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function IntelligenceView() {
  return (
    <div style={viewWrap}>
      <SectionLabel>INTELLIGENCE</SectionLabel>
      <div style={{ marginBottom: 18 }}>
        {MOCK_INTELLIGENCE.map((item, i) => (
          <div
            key={i}
            style={{
              marginBottom: 8,
              padding: "11px 14px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <span className="orb" style={{ fontSize: 8, color: C.primary, letterSpacing: "0.14em" }}>
                {item.tag}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p className="raj" style={{ fontSize: 12, color: C.textMid, fontWeight: 300, lineHeight: 1.5 }}>
                {item.title}
              </p>
            </div>
            <span className="mono" style={{ fontSize: 9, color: C.textLow, flexShrink: 0 }}>
              {item.entry === "new" ? <span style={{ color: C.bright }}>NEW</span> : `#${item.entry}`}
            </span>
          </div>
        ))}
      </div>

      <SectionLabel>PATTERN RECOGNITION</SectionLabel>
      <div style={{ background: C.surfHi, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px" }}>
        <div className="orb" style={{ fontSize: 9, color: C.gold, letterSpacing: "0.16em", marginBottom: 8 }}>
          JARVIS OBSERVATION
        </div>
        <p className="raj" style={{ fontSize: 12, color: C.textMid, fontWeight: 300, lineHeight: 1.6 }}>
          Airbnb&apos;s partner programme mirrors Stayful&apos;s exact operating model. Pattern: platform players eventually encroach on operators they failed to acquire. Recommend building trust moat now — local relationships, personalised PMI reports, and case studies they cannot replicate at scale.
        </p>
      </div>
    </div>
  );
}

export function ConversationView({
  messages,
  onApprove,
  onDeny,
}: {
  messages: Message[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  return (
    <div style={viewWrap}>
      <SectionLabel>CONVERSATION LOG</SectionLabel>
      <div>
        {messages.map((m) => (
          <MessageRenderer
            key={m.id}
            message={m}
            onApprove={onApprove}
            onDeny={onDeny}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
