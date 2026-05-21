"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTTS } from "@/hooks/useTTS";
import { detectSalesAction } from "@/lib/sales/commands";
import { S } from "./styles";
import { DateRangePicker } from "./DateRangePicker";
import { Chunk, Divider, LoadingSkeleton, ChunkErrorState } from "./ChunkWrapper";
import type { ChunkStatus } from "./ChunkWrapper";
import { PipelineFunnel } from "./PipelineFunnel";
import { OutreachMetrics } from "./OutreachMetrics";
import { WebMeetingMetrics } from "./WebMeetingMetrics";
import { SpecialOffers } from "./SpecialOffers";
import { useSalesChunk } from "./useSalesChunk";
import type { ChunkId, DateRange, PresetKey } from "./types";

const CHUNK_ORDER: ChunkId[] = ["pipeline", "outreach", "meetings", "offers"];

function computeRange(preset: PresetKey, customFrom: string, customTo: string): DateRange {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().split("T")[0];
  if (preset === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: iso(from), to: iso(now) };
  }
  if (preset === "month") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: iso(from), to: iso(now) };
  }
  if (preset === "year") {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    return { from: iso(from), to: iso(now) };
  }
  if (customFrom && customTo) return { from: customFrom, to: customTo };
  return { from: null, to: null };
}

export function SalesDashboard() {
  const router = useRouter();
  const [focusedChunk, setFocusedChunk] = useState<ChunkId | null>("pipeline");

  const [preset, setPreset] = useState<PresetKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const range = useMemo(
    () => computeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const pipeline = useSalesChunk("pipeline", range);
  const outreach = useSalesChunk("outreach", range);
  const meetings = useSalesChunk("meetings", range);
  const offers = useSalesChunk("offers", range);

  const anyLoading =
    pipeline.loading || outreach.loading || meetings.loading || offers.loading;
  const anyError =
    !!pipeline.error || !!outreach.error || !!meetings.error || !!offers.error;

  const activityLogsAvailable =
    pipeline.meta?.activityLogsAvailable ??
    outreach.meta?.activityLogsAvailable ??
    meetings.meta?.activityLogsAvailable ??
    offers.meta?.activityLogsAvailable;

  // ── Voice handling ────────────────────────────────────────────────
  const tts = useTTS();
  const focusedRef = useRef(focusedChunk);
  useEffect(() => {
    focusedRef.current = focusedChunk;
  }, [focusedChunk]);

  const speakSummaryForChunk = useCallback(
    async (chunk: ChunkId) => {
      try {
        const params = new URLSearchParams();
        params.set("chunk", chunk);
        if (range.from) params.set("from", range.from);
        if (range.to) params.set("to", range.to);
        const res = await fetch(`/api/sales/summarise?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.text) await tts.speak(data.text);
      } catch (err) {
        console.error("[sales/summarise]", err);
        tts.speak("Summary unavailable. Try again in a moment.");
      }
    },
    [range.from, range.to, tts],
  );

  const cycleChunk = useCallback((delta: 1 | -1) => {
    setFocusedChunk((current) => {
      const idx = current ? CHUNK_ORDER.indexOf(current) : 0;
      const next = (idx + delta + CHUNK_ORDER.length) % CHUNK_ORDER.length;
      return CHUNK_ORDER[next];
    });
  }, []);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const action = detectSalesAction(text);
      if (!action) return;
      switch (action.kind) {
        case "focus":
          setFocusedChunk(action.chunk);
          tts.speak(`Focusing on ${action.chunk}.`);
          break;
        case "summarise":
          if (focusedRef.current) speakSummaryForChunk(focusedRef.current);
          break;
        case "next":
          cycleChunk(1);
          break;
        case "previous":
          cycleChunk(-1);
          break;
        case "close":
          tts.stop();
          router.push("/");
          break;
      }
    },
    [cycleChunk, router, speakSummaryForChunk, tts],
  );

  const voice = useVoiceInput({ onFinalTranscript: handleVoiceTranscript });
  const voiceMountedRef = useRef(false);
  const [voiceUserError, setVoiceUserError] = useState<string | null>(null);

  // Try auto-start after a short grace so the home-page listener tears
  // down cleanly. If the browser blocks auto-start (no prior user
  // gesture, or mic permission denied), the user can click the voice
  // pill to retry — that gesture unblocks getUserMedia.
  useEffect(() => {
    if (voiceMountedRef.current) return;
    voiceMountedRef.current = true;
    const t = setTimeout(() => {
      voice.startListening().catch((err) => {
        setVoiceUserError(typeof err === "string" ? err : "Click to enable");
      });
    }, 120);
    return () => {
      clearTimeout(t);
      voice.stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVoice = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
      setVoiceUserError("Click to enable");
    } else {
      setVoiceUserError(null);
      voice.startListening().catch((err) => {
        setVoiceUserError(
          typeof err === "string" ? err : "Mic permission denied",
        );
      });
    }
  }, [voice]);

  const pipelineStatus: ChunkStatus = pipeline.loading
    ? "loading"
    : pipeline.error
      ? "error"
      : "live";
  const outreachStatus: ChunkStatus = outreach.loading
    ? "loading"
    : outreach.error
      ? "error"
      : "live";
  const meetingsStatus: ChunkStatus = meetings.loading
    ? "loading"
    : meetings.error
      ? "error"
      : "live";
  const offersStatus: ChunkStatus = offers.loading
    ? "loading"
    : offers.error
      ? "error"
      : "live";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: S.bg,
        color: S.text,
        fontFamily: "Rajdhani, sans-serif",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(8,12,9,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${S.border}`,
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: S.green,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="orb"
            style={{ fontSize: 12, letterSpacing: "0.22em", color: S.greenHi }}
          >
            JARVIS
          </span>
          <span style={{ width: 1, height: 14, background: S.border }} />
          <span
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.15em", color: S.textDim }}
          >
            SALES INTELLIGENCE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DateRangePicker
            preset={preset}
            onPreset={setPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
          />
          <button
            onClick={() => tts.toggleMuted()}
            title={tts.muted ? "Unmute briefings" : "Mute briefings"}
            style={{
              background: S.surface,
              border: `1px solid ${S.border}`,
              borderRadius: 6,
              cursor: "pointer",
              color: tts.muted ? S.textMuted : S.greenHi,
              padding: 5,
              display: "flex",
              alignItems: "center",
            }}
          >
            {tts.muted ? <MicOff size={12} /> : <Mic size={12} />}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: anyLoading ? S.amber : anyError ? S.red : "#4ade80",
                animation: anyLoading ? "pulse 1.5s ease infinite" : "none",
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 9,
                color: S.textDim,
                letterSpacing: "0.08em",
              }}
            >
              {anyLoading ? "LOADING" : anyError ? "PARTIAL" : "LIVE"}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: 0, paddingBottom: 80 }}>
        <Chunk
          id="pipeline"
          index="01"
          name="Pipeline Overview"
          focused={focusedChunk === "pipeline"}
          onClick={() => setFocusedChunk("pipeline")}
          status={pipelineStatus}
          delayMs={0}
        >
          {pipeline.loading && <LoadingSkeleton cols={5} />}
          {pipeline.error && !pipeline.loading && (
            <ChunkErrorState
              message={pipeline.error}
              onRetry={pipeline.refetch}
            />
          )}
          {pipeline.data && !pipeline.loading && (
            <PipelineFunnel
              pipeline={pipeline.data}
              total={pipeline.meta?.total ?? 0}
              range={range}
            />
          )}
        </Chunk>

        <Divider label="Outreach Channels" />

        <Chunk
          id="outreach"
          index="02"
          name="Outreach Activity"
          focused={focusedChunk === "outreach"}
          onClick={() => setFocusedChunk("outreach")}
          status={outreachStatus}
          delayMs={50}
        >
          {outreach.loading && <LoadingSkeleton cols={3} />}
          {outreach.error && !outreach.loading && (
            <ChunkErrorState
              message={outreach.error}
              onRetry={outreach.refetch}
            />
          )}
          {outreach.data && !outreach.loading && (
            <OutreachMetrics outreach={outreach.data} />
          )}
        </Chunk>

        <Divider label="Post-Meeting Conversion" />

        <Chunk
          id="meetings"
          index="03"
          name="Web Meeting Performance"
          focused={focusedChunk === "meetings"}
          onClick={() => setFocusedChunk("meetings")}
          status={meetingsStatus}
          delayMs={100}
        >
          {meetings.loading && <LoadingSkeleton cols={4} />}
          {meetings.error && !meetings.loading && (
            <ChunkErrorState
              message={meetings.error}
              onRetry={meetings.refetch}
            />
          )}
          {meetings.data && !meetings.loading && (
            <WebMeetingMetrics
              pipeline={meetings.data}
              activityLogsAvailable={meetings.meta?.activityLogsAvailable}
            />
          )}
        </Chunk>

        <Divider label="Offer Management" />

        <Chunk
          id="offers"
          index="04"
          name="Special Offers"
          focused={focusedChunk === "offers"}
          onClick={() => setFocusedChunk("offers")}
          status={offersStatus}
          delayMs={150}
        >
          {offers.loading && <LoadingSkeleton cols={4} />}
          {offers.error && !offers.loading && (
            <ChunkErrorState message={offers.error} onRetry={offers.refetch} />
          )}
          {offers.data && !offers.loading && <SpecialOffers offers={offers.data} />}
        </Chunk>

        {/* Footer hint when activity logs unavailable */}
        {activityLogsAvailable === false && (
          <div
            className="mono"
            style={{
              padding: "16px 28px 28px",
              fontSize: 9,
              color: S.textMuted,
              letterSpacing: "0.08em",
              lineHeight: 1.6,
            }}
          >
            Pipeline stage history tracking from setup date. Lead volume data
            available from board creation.
          </div>
        )}
      </main>

      {/* Voice overlay */}
      <VoiceOverlay
        listening={voice.isListening}
        partial={voice.partialTranscript}
        muted={tts.muted}
        speaking={tts.isSpeaking}
        errorMessage={voiceUserError}
        onClick={toggleVoice}
      />

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes scanline { 0% { top: -2px } 100% { top: 100% } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

function VoiceOverlay({
  listening,
  partial,
  muted,
  speaking,
  errorMessage,
  onClick,
}: {
  listening: boolean;
  partial: string;
  muted: boolean;
  speaking: boolean;
  errorMessage: string | null;
  onClick: () => void;
}) {
  const label = speaking
    ? "SPEAKING"
    : partial
      ? partial.slice(0, 40).toUpperCase()
      : listening
        ? muted
          ? "LISTENING · MUTED"
          : 'SAY "FOCUS ON…", "SUMMARISE", "CLOSE SALES"'
        : errorMessage
          ? `VOICE OFF — ${errorMessage.toUpperCase()}`
          : "CLICK TO ENABLE VOICE";

  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        position: "fixed",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(13, 20, 13, 0.92)",
        border: `1px solid ${listening ? S.borderHi : S.border}`,
        borderRadius: 999,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        backdropFilter: "blur(12px)",
        zIndex: 50,
        maxWidth: "80vw",
        cursor: "pointer",
        color: "inherit",
      }}
      aria-label={listening ? "Stop voice" : "Enable voice"}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: speaking ? S.greenHi : listening ? S.green : S.textMuted,
          animation:
            speaking || listening ? "pulse 1.5s ease infinite" : "none",
        }}
      />
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: listening ? S.greenHi : S.textDim,
        }}
      >
        {label}
      </span>
    </button>
  );
}
