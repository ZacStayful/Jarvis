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

export default function WhatsAppTestPanel() {
  const [leadId, setLeadId] = useState("");
  const [response, setResponse] = useState<ResponseState>({ kind: "idle" });
  const [history, setHistory] = useState<
    Array<{ leadId: string; status: number | null; body: any; at: string }>
  >([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const id = leadId.trim();
    if (!id) return;
    setResponse({ kind: "loading" });
    try {
      const res = await fetch("/api/whatsapp/send-initial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id }),
      });
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = { error: "non_json_response" };
      }
      const entry = {
        leadId: id,
        status: res.status,
        body,
        at: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      };
      setHistory((h) => [entry, ...h].slice(0, 10));
      if (res.ok) {
        setResponse({ kind: "ok", status: res.status, body });
      } else {
        setResponse({ kind: "error", status: res.status, body });
      }
    } catch (err) {
      const message = (err as Error).message || "network_error";
      const entry = {
        leadId: id,
        status: null,
        body: { error: message },
        at: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      };
      setHistory((h) => [entry, ...h].slice(0, 10));
      setResponse({ kind: "error", status: null, body: { error: message }, message });
    }
  }

  const loading = response.kind === "loading";

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
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-sm text-sm outline-none focus:ring-1"
              style={{
                backgroundColor: C.bg,
                border: `1px solid ${C.borderHi}`,
                color: C.text,
              }}
            />
            <button
              type="submit"
              disabled={loading || !leadId.trim()}
              className="px-4 py-2 rounded-sm text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 transition-opacity"
              style={{
                backgroundColor: C.surfHi,
                border: `1px solid ${C.borderHi}`,
                color: C.bright,
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {loading ? "Sending" : "Send"}
            </button>
          </div>
          <p className="text-[11px] mt-3" style={{ color: C.textLow }}>
            This sends a real SMS via Twilio. Use a lead row you control. Re-submitting the same ID returns
            <code style={{ color: C.amber }}> already_contacted</code>.
          </p>
        </form>

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
      </div>
    </main>
  );
}
