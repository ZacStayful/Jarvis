"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Send } from "lucide-react";
import { C } from "@/lib/jarvis-design";

type ResponseState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; status: number; body: any }
  | { kind: "error"; status: number | null; body: any; message?: string };

type HistoryEntry = {
  leadId: string;
  status: number | null;
  body: any;
  at: string;
  meta?: string;
};

function StatusPill({ status, label }: { status: number | null; label: string }) {
  const tone =
    status === null
      ? { bg: "rgba(224,68,68,0.15)", fg: C.red, border: "rgba(224,68,68,0.4)" }
      : status >= 500
      ? { bg: "rgba(224,68,68,0.15)", fg: C.red, border: "rgba(224,68,68,0.4)" }
      : status >= 400
      ? { bg: "rgba(244,164,53,0.15)", fg: C.amber, border: "rgba(244,164,53,0.4)" }
      : { bg: "rgba(122,186,110,0.15)", fg: C.bright, border: "rgba(122,186,110,0.4)" };
  return (
    <span
      className="text-[11px] tracking-wider uppercase px-2 py-1 rounded-sm border"
      style={{ backgroundColor: tone.bg, color: tone.fg, borderColor: tone.border }}
    >
      {label}
    </span>
  );
}

function ResponseDisplay({
  response,
  history,
}: {
  response: ResponseState;
  history: HistoryEntry[];
}) {
  return (
    <>
      {response.kind !== "idle" && (
        <section
          className="rounded-sm p-5 mb-6"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-widest" style={{ color: C.textMid }}>
              Latest Response
            </h2>
            {response.kind === "loading" && <StatusPill status={0} label="Pending" />}
            {response.kind === "ok" && (
              <StatusPill status={response.status} label={`${response.status} OK`} />
            )}
            {response.kind === "error" && (
              <StatusPill
                status={response.status}
                label={response.status ? `${response.status} Error` : "Network Error"}
              />
            )}
          </div>
          {response.kind !== "loading" && (
            <pre
              className="text-xs p-3 rounded-sm overflow-x-auto leading-relaxed"
              style={{
                backgroundColor: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
              }}
            >
              {JSON.stringify(response.body, null, 2)}
            </pre>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section
          className="rounded-sm p-5"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: C.textMid }}>
            Recent (last {history.length})
          </h2>
          <ul className="space-y-2">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm text-xs"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span style={{ color: C.textLow }}>{h.at}</span>
                  <span style={{ color: C.text }}>lead {h.leadId}</span>
                  {h.meta && <span style={{ color: C.textMid }}>· {h.meta}</span>}
                  {h.body?.skipped && (
                    <span style={{ color: C.amber }}>· skipped ({h.body.reason})</span>
                  )}
                  {h.body?.messageSid && (
                    <span className="truncate" style={{ color: C.bright }}>
                      · {h.body.messageSid}
                    </span>
                  )}
                  {h.body?.error && (
                    <span className="truncate" style={{ color: C.red }}>
                      · {h.body.error}
                    </span>
                  )}
                </div>
                <StatusPill
                  status={h.status}
                  label={h.status === null ? "Net" : String(h.status)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

async function callEndpoint(
  url: string,
  payload: Record<string, any>,
): Promise<{ status: number | null; body: any }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = { error: "non_json_response" };
    }
    return { status: res.status, body };
  } catch (err) {
    const message = (err as Error).message || "network_error";
    return { status: null, body: { error: message } };
  }
}

export default function WhatsAppTestPanel() {
  // ── send-initial state ─────────────────────────────────────────────────
  const [leadId, setLeadId] = useState("");
  const [response, setResponse] = useState<ResponseState>({ kind: "idle" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ── send-followup state ────────────────────────────────────────────────
  const [followupLeadId, setFollowupLeadId] = useState("");
  const [followupStep, setFollowupStep] = useState<1 | 2 | 3 | 4>(1);
  const [followupMode, setFollowupMode] = useState<"cold" | "reengagement">("cold");
  const [followupResponse, setFollowupResponse] = useState<ResponseState>({ kind: "idle" });
  const [followupHistory, setFollowupHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const id = leadId.trim();
    if (!id) return;
    setResponse({ kind: "loading" });
    const { status, body } = await callEndpoint("/api/whatsapp/send-initial", { leadId: id });
    const entry: HistoryEntry = {
      leadId: id,
      status,
      body,
      at: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    };
    setHistory((h) => [entry, ...h].slice(0, 10));
    if (status === null) {
      setResponse({ kind: "error", status: null, body });
    } else if (status >= 200 && status < 300) {
      setResponse({ kind: "ok", status, body });
    } else {
      setResponse({ kind: "error", status, body });
    }
  }

  async function submitFollowup(e?: React.FormEvent) {
    e?.preventDefault();
    const id = followupLeadId.trim();
    if (!id) return;
    setFollowupResponse({ kind: "loading" });
    const { status, body } = await callEndpoint("/api/whatsapp/send-followup", {
      leadId: id,
      step: followupStep,
      mode: followupMode,
    });
    const entry: HistoryEntry = {
      leadId: id,
      status,
      body,
      at: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      meta: `step ${followupStep} · ${followupMode}`,
    };
    setFollowupHistory((h) => [entry, ...h].slice(0, 10));
    if (status === null) {
      setFollowupResponse({ kind: "error", status: null, body });
    } else if (status >= 200 && status < 300) {
      setFollowupResponse({ kind: "ok", status, body });
    } else {
      setFollowupResponse({ kind: "error", status, body });
    }
  }

  const initialLoading = response.kind === "loading";
  const followupLoading = followupResponse.kind === "loading";

  const inputStyle = {
    backgroundColor: C.bg,
    border: `1px solid ${C.borderHi}`,
    color: C.text,
  };
  const buttonStyle = {
    backgroundColor: C.surfHi,
    border: `1px solid ${C.borderHi}`,
    color: C.bright,
  };

  return (
    <main
      className="min-h-screen w-full flex flex-col"
      style={{ backgroundColor: C.bg, color: C.text, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
    >
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: C.border }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-xs uppercase tracking-widest hover:opacity-80"
          style={{ color: C.textMid }}
        >
          <ChevronLeft size={14} />
          Command Centre
        </Link>
        <div className="text-xs uppercase tracking-widest" style={{ color: C.textLow }}>
          SMS · Test Panel
        </div>
      </header>

      <div className="flex-1 px-6 py-8 max-w-3xl w-full mx-auto">
        {/* ── Section 1: Initial outreach ─────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl mb-1" style={{ color: C.text }}>
            Trigger Initial Outreach
          </h1>
          <p className="text-sm" style={{ color: C.textMid }}>
            Manually fires <code style={{ color: C.bright }}>POST /api/whatsapp/send-initial</code> with the
            given Monday lead ID. Sends a real Twilio SMS to the lead&rsquo;s phone. Same path n8n will use in
            production. Skips if the lead already has WA Messages Sent &gt; 0.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-sm p-5 mb-6"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <label
            className="block text-[11px] uppercase tracking-widest mb-2"
            style={{ color: C.textMid }}
            htmlFor="leadId"
          >
            Monday Lead ID
          </label>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              id="leadId"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              placeholder="e.g. 1234567890"
              disabled={initialLoading}
              className="flex-1 px-3 py-2 rounded-sm text-sm outline-none focus:ring-1"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={initialLoading || !leadId.trim()}
              className="px-4 py-2 rounded-sm text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 transition-opacity"
              style={buttonStyle}
            >
              {initialLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {initialLoading ? "Sending" : "Send"}
            </button>
          </div>
          <p className="text-[11px] mt-3" style={{ color: C.textLow }}>
            This sends a real SMS via Twilio. Use a lead row you control. Re-submitting the same ID returns
            <code style={{ color: C.amber }}> already_contacted</code>.
          </p>
        </form>

        <ResponseDisplay response={response} history={history} />

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div
          className="my-10 flex items-center gap-4"
          style={{ color: C.textLow }}
        >
          <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
          <span className="text-[11px] uppercase tracking-widest">Follow-Up</span>
          <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
        </div>

        {/* ── Section 2: Follow-up ────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl mb-1" style={{ color: C.text }}>
            Trigger Follow-Up
          </h1>
          <p className="text-sm" style={{ color: C.textMid }}>
            Manually fires <code style={{ color: C.bright }}>POST /api/whatsapp/send-followup</code> with a step
            (1&ndash;4) and a mode. <code style={{ color: C.bright }}>cold</code> targets leads who never
            replied; <code style={{ color: C.bright }}>reengagement</code> targets leads who replied then went
            silent. Step 4 closes the sequence and marks the lead complete.
          </p>
        </div>

        <form
          onSubmit={submitFollowup}
          className="rounded-sm p-5 mb-6"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mb-3">
            <div>
              <label
                className="block text-[11px] uppercase tracking-widest mb-2"
                style={{ color: C.textMid }}
                htmlFor="followupLeadId"
              >
                Monday Lead ID
              </label>
              <input
                id="followupLeadId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                value={followupLeadId}
                onChange={(e) => setFollowupLeadId(e.target.value)}
                placeholder="e.g. 1234567890"
                disabled={followupLoading}
                className="w-full px-3 py-2 rounded-sm text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-[11px] uppercase tracking-widest mb-2"
                style={{ color: C.textMid }}
                htmlFor="followupStep"
              >
                Step
              </label>
              <select
                id="followupStep"
                value={followupStep}
                onChange={(e) => setFollowupStep(Number(e.target.value) as 1 | 2 | 3 | 4)}
                disabled={followupLoading}
                className="px-3 py-2 rounded-sm text-sm outline-none"
                style={inputStyle}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            <div>
              <label
                className="block text-[11px] uppercase tracking-widest mb-2"
                style={{ color: C.textMid }}
                htmlFor="followupMode"
              >
                Mode
              </label>
              <select
                id="followupMode"
                value={followupMode}
                onChange={(e) =>
                  setFollowupMode(e.target.value as "cold" | "reengagement")
                }
                disabled={followupLoading}
                className="px-3 py-2 rounded-sm text-sm outline-none"
                style={inputStyle}
              >
                <option value="cold">cold</option>
                <option value="reengagement">reengagement</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={followupLoading || !followupLeadId.trim()}
              className="px-4 py-2 rounded-sm text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 transition-opacity"
              style={buttonStyle}
            >
              {followupLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {followupLoading ? "Sending" : "Send"}
            </button>
          </div>
          <p className="text-[11px] mt-3" style={{ color: C.textLow }}>
            Real SMS via Twilio. <code style={{ color: C.amber }}>cold</code> mode skips leads whose WA Status
            is already Replied/Booked/Abandoned. <code style={{ color: C.amber }}>reengagement</code> mode
            targets Replied leads specifically. Step 4 sets WA Completed and the appropriate terminal status.
          </p>
        </form>

        <ResponseDisplay response={followupResponse} history={followupHistory} />
      </div>
    </main>
  );
}
