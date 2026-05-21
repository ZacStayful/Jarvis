"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  CheckSquare,
  Eye,
  Mic,
  MicOff,
  MessageSquare,
  Radio,
  Send,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { C, routeCommand, type ViewId } from "@/lib/jarvis-design";
import type { ViewRoute } from "@/lib/commandRouter";
import { useJARVIS } from "@/hooks/useJARVIS";
import { useCrossSessionContext } from "@/hooks/useCrossSessionContext";
import type { JARVISState, Message } from "@/types/jarvis";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTTS } from "@/hooks/useTTS";
import { useTranscriptPersistence } from "@/hooks/useTranscriptPersistence";
import { LearningSystem, isEODCommand } from "@/components/learning/LearningSystem";
import { detectLucyCommand } from "@/lib/lucy-commands";
import { detectPortfolioCommand } from "@/lib/portfolio/commands";
import { detectSalesCommand } from "@/lib/sales/commands";
import { LucyView } from "@/views/LucyView";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { GlobalStyles } from "@/components/jarvis/GlobalStyles";
import { BrainNetwork } from "@/components/jarvis/BrainNetwork";
import { JarvisEye } from "@/components/jarvis/JarvisEye";
import { Bubble } from "@/components/jarvis/Bubble";
import { MessageRenderer } from "@/components/MessageRenderer";
import NewsBriefingView from "@/components/views/NewsBriefingView";
import InvestmentDashboardView from "@/components/views/InvestmentDashboardView";
import {
  CommandView,
  ConversationView,
  IntelligenceView,
  InvestmentsView,
  LeadsView,
  NewsView,
  TasksView,
} from "@/components/jarvis/views";

const STATUS_LABELS: Record<JARVISState, string> = {
  idle: "SYSTEMS NOMINAL",
  thinking: "PROCESSING . . .",
  speaking: "TRANSMITTING",
  listening: "LISTENING",
};

const SHORT_STATUS: Record<JARVISState, string> = {
  idle: "NOMINAL",
  thinking: "THINKING",
  speaking: "SPEAKING",
  listening: "LISTENING",
};

export default function JarvisPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewId | null>(null);
  const [routedView, setRoutedView] = useState<ViewRoute>(null);
  const [viewParams, setViewParams] = useState<Record<string, unknown>>({});
  const [input, setInput] = useState("");
  const feedRef = useRef<HTMLDivElement | null>(null);

  // Voice output — using the working Phase 2 `/api/speak` server proxy.
  // Phase 8's client-side ElevenLabs streaming is intentionally disabled
  // (voiceEnabled: false on useJARVIS) — re-enable once the NEXT_PUBLIC_*
  // ElevenLabs env vars are added in Vercel.
  const { speak, stop: stopSpeaking, isSpeaking, muted, toggleMuted } = useTTS();

  // Phase 8 — load cross-session context block to inject into the system prompt
  const crossSession = useCrossSessionContext();
  const crossSessionBlock = crossSession.buildContextBlock();

  const {
    messages,
    jarvisState,
    isLoading,
    sendMessage,
    approveAction,
    denyAction,
    endSession,
  } = useJARVIS({
    onRoute: (view, params) => {
      setRoutedView(view);
      if (params) setViewParams(params);
    },
    crossSessionContext: crossSessionBlock,
    // Disable Phase 8 client-streaming voice — we use the server proxy below
    voiceEnabled: false,
    persistSession: true,
  });

  // Phase 6 — persist transcripts to localStorage on every message update
  useTranscriptPersistence(messages);

  // Phase 6 — end-of-day learning panel overlay
  const [learningOpen, setLearningOpen] = useState(false);

  // Phase 7 — Lucy intelligence centre
  const [lucyOpen, setLucyOpen] = useState(false);

  // Portfolio Intelligence Dashboard (mounted inline inside the JARVIS shell)
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  // Centralised "switch view" helper — every nav intent must clear its
  // siblings first, otherwise the render precedence makes the first-opened
  // view sticky (see app/page.tsx:306–323 ternary chain).
  const clearAllViews = useCallback(() => {
    setActiveView(null);
    setRoutedView(null);
    setLucyOpen(false);
    setPortfolioOpen(false);
    // learningOpen is an overlay — intentionally left alone so EOD can
    // layer over whatever's currently in the shell.
  }, []);

  // Track which message ids have already been spoken
  const spokenIdsRef = useRef<Set<string>>(new Set());

  // Speak newly completed assistant messages via /api/speak (ElevenLabs proxy)
  useEffect(() => {
    if (muted) return;
    const latest = messages[messages.length - 1];
    if (
      latest &&
      latest.role === "assistant" &&
      !latest.isStreaming &&
      latest.content.trim() &&
      !spokenIdsRef.current.has(latest.id)
    ) {
      spokenIdsRef.current.add(latest.id);
      speak(latest.content);
    }
  }, [messages, muted, speak]);

  // Auto-greet on first mount (after login). Uses sessionStorage so a hard
  // refresh inside the same tab doesn't keep replaying the welcome.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("jarvis_greeted") === "true") {
      greetedRef.current = true;
      return;
    }
    greetedRef.current = true;
    window.sessionStorage.setItem("jarvis_greeted", "true");
    if (!muted) {
      speak("Welcome back, Zac. Systems are online. How may I assist?");
    }
  }, [muted, speak]);

  // Phase 8 — Escape key stops in-flight voice playback
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopSpeaking();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stopSpeaking]);

  // Phase 8 — summarise session on tab close (best-effort, non-blocking)
  useEffect(() => {
    const handler = () => {
      endSession().catch(() => {});
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [endSession]);

  // Always-on voice — persisted in localStorage, default on
  const [voiceAlwaysOn, setVoiceAlwaysOn] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("jarvis_voice_always_on");
    if (stored !== null) setVoiceAlwaysOn(stored === "true");
  }, []);
  const toggleVoiceAlwaysOn = () => {
    const next = !voiceAlwaysOn;
    setVoiceAlwaysOn(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("jarvis_voice_always_on", String(next));
    }
  };

  const { startListening, stopListening, isListening, partialTranscript } = useVoiceInput({
    onFinalTranscript: (text) => {
      stopSpeaking();
      applyNavIntents(text);
      sendMessage(text);
      // Re-arm listening after the silence-triggered stop, if always-on
      if (voiceAlwaysOn) {
        setTimeout(() => {
          startListening().catch(() => {});
        }, 600);
      }
    },
  });

  // Shared nav-intent handler used by both voice and text paths. Detect
  // every possible intent, clear competing views once, then set the winner.
  // Priority: portfolio > lucy > clientside route. EOD is an overlay and
  // doesn't disturb the underlying view.
  const applyNavIntents = (text: string) => {
    if (isEODCommand(text)) setLearningOpen(true);

    // Sales takes precedence over Lucy — "pipeline" / "sales" route to the
    // new standalone /sales dashboard rather than the legacy Lucy / leads view.
    const sales = detectSalesCommand(text);
    if (sales === 'navigate') {
      router.push('/sales');
      return;
    }

    const lucy = detectLucyCommand(text);
    const portfolio = detectPortfolioCommand(text);
    const route = routeCommand(text);

    if (!lucy && !portfolio && !route) return;

    clearAllViews();
    if (portfolio) setPortfolioOpen(true);
    else if (lucy) setLucyOpen(true);
    else if (route) setActiveView(route);
  };

  // Combined visual state
  const state: JARVISState = isListening
    ? "listening"
    : isSpeaking
    ? "speaking"
    : jarvisState;

  // Always-on voice: auto-start on mount and restart whenever JARVIS stops
  // speaking. Pause during JARVIS's own speech so the mic doesn't pick up
  // and transcribe its replies (feedback loop).
  useEffect(() => {
    if (!voiceAlwaysOn) {
      if (isListening) stopListening();
      return;
    }
    if (isSpeaking) {
      if (isListening) stopListening();
      return;
    }
    if (!isListening && !isLoading) {
      const t = setTimeout(() => {
        startListening().catch(() => {});
      }, 400);
      return () => clearTimeout(t);
    }
  }, [voiceAlwaysOn, isSpeaking, isListening, isLoading, startListening, stopListening]);

  // Auto-scroll message feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const txt = input.trim();
    if (!txt || isLoading) return;
    setInput("");
    stopSpeaking();
    applyNavIntents(txt);
    sendMessage(txt);
  };

  const handleViewSelect = (id: ViewId | null) => {
    setActiveView(id === activeView ? null : id);
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const hasView = activeView !== null;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <GlobalStyles />
      <BrainNetwork state={state} />

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(${C.primary}08 1px, transparent 1px), linear-gradient(90deg, ${C.primary}08 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          animation: "ambientGrid 4s ease-in-out infinite",
        }}
      />

      <Header
        state={state}
        activeView={activeView}
        routedView={routedView}
        lucyOpen={lucyOpen}
        portfolioOpen={portfolioOpen}
        onNavBack={clearAllViews}
        onLogout={handleLogout}
        muted={muted}
        onToggleMuted={toggleMuted}
      />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>
        {portfolioOpen ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex" }}>
            <PortfolioView />
          </div>
        ) : lucyOpen ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <LucyView />
          </div>
        ) : routedView === "news-briefing" ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <NewsBriefingView autoFetch />
          </div>
        ) : routedView === "investment-dashboard" ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <InvestmentDashboardView
              initialQuery={viewParams.query as string | undefined}
            />
          </div>
        ) : !hasView ? (
          <NoViewLayout
            state={state}
            messages={messages}
            feedRef={feedRef}
            onApprove={approveAction}
            onDeny={denyAction}
          />
        ) : (
          <SplitLayout
            state={state}
            messages={messages}
            feedRef={feedRef}
            activeView={activeView}
            onApprove={approveAction}
            onDeny={denyAction}
          />
        )}
      </div>

      <CommandInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        isListening={isListening}
        partialTranscript={partialTranscript}
        onToggleListen={toggleVoiceAlwaysOn}
        voiceAlwaysOn={voiceAlwaysOn}
        state={state}
        isLoading={isLoading}
      />

      <NavDots activeView={activeView} onSelect={handleViewSelect} />

      <LearningSystem
        isOpen={learningOpen}
        onClose={() => setLearningOpen(false)}
      />
    </div>
  );
}

/* ─────────── Header ─────────── */

function Header({
  state,
  activeView,
  routedView,
  lucyOpen,
  portfolioOpen,
  onNavBack,
  onLogout,
  muted,
  onToggleMuted,
}: {
  state: JARVISState;
  activeView: ViewId | null;
  routedView: ViewRoute;
  lucyOpen: boolean;
  portfolioOpen: boolean;
  onNavBack: () => void;
  onLogout: () => void;
  muted: boolean;
  onToggleMuted: () => void;
}) {
  const showBack =
    activeView !== null || routedView !== null || lucyOpen || portfolioOpen;
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const n = new Date();
      setTime(
        n.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const stateColor: Record<JARVISState, string> = {
    idle: C.textLow,
    thinking: C.cyan,
    speaking: C.bright,
    listening: C.amber,
  };
  const colour = stateColor[state];

  return (
    <header
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, #0a180a 0%, transparent 100%)`,
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showBack && (
          <button
            onClick={onNavBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.primary,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ChevronLeft size={14} />
          </button>
        )}
        <span
          className="orb"
          style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: C.bright }}
        >
          J.A.R.V.I.S
        </span>
        <span style={{ width: 1, height: 14, background: C.border }} />
        <span
          className="mono"
          style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.18em" }}
        >
          STAYFUL COMMAND
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: colour,
              animation:
                state !== "idle"
                  ? `dotPulse ${state === "thinking" ? 0.5 : 1}s ease-in-out infinite`
                  : "none",
            }}
          />
          <span
            className="mono"
            style={{ fontSize: 9, color: colour, letterSpacing: "0.15em" }}
          >
            {state.toUpperCase()}
          </span>
        </div>
        <span
          className="mono"
          style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.12em" }}
        >
          {time}
        </span>
        <button
          onClick={onToggleMuted}
          title={muted ? "Unmute voice" : "Mute voice"}
          aria-label={muted ? "Unmute voice" : "Mute voice"}
          style={{
            background: "none",
            border: `1px solid ${muted ? C.border : C.primary + "66"}`,
            color: muted ? C.textLow : C.bright,
            padding: "3px 6px",
            borderRadius: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
        <button
          onClick={onLogout}
          className="mono"
          style={{
            fontSize: 9,
            color: C.textLow,
            letterSpacing: "0.15em",
            background: "none",
            border: `1px solid ${C.border}`,
            padding: "3px 8px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          DISCONNECT
        </button>
      </div>
    </header>
  );
}

/* ─────────── Layouts ─────────── */

function NoViewLayout({
  state,
  messages,
  feedRef,
  onApprove,
  onDeny,
}: {
  state: JARVISState;
  messages: Message[];
  feedRef: React.RefObject<HTMLDivElement | null>;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 20,
        paddingRight: 44,
        overflow: "hidden",
      }}
    >
      <JarvisEye state={state} size={200} />

      <div style={{ textAlign: "center", marginTop: 10, marginBottom: 16 }}>
        <div
          className="orb"
          style={{
            fontSize: 9,
            letterSpacing: "0.28em",
            color:
              state === "thinking"
                ? C.cyan
                : state === "speaking"
                ? C.bright
                : state === "listening"
                ? C.amber
                : C.textLow,
            animation: state === "thinking" ? "statusFlash 1.2s ease-in-out infinite" : "none",
          }}
        >
          {STATUS_LABELS[state]}
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          {["CORE", "NEURAL", "COMM", "DATA"].map((l, i) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: state !== "idle" ? C.bright : C.dim,
                  animation:
                    state !== "idle"
                      ? `dotPulse ${0.5 + i * 0.18}s ease-in-out infinite`
                      : "none",
                }}
              />
              <span
                className="mono"
                style={{ fontSize: 7, color: C.textLow, letterSpacing: "0.14em" }}
              >
                {l}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: "auto",
          width: "100%",
          maxWidth: 640,
          padding: "0 20px 12px",
        }}
      >
        {messages.length === 0 && (
          <div style={{ marginTop: 12 }}>
            <Bubble
              msg={{
                role: "assistant",
                content:
                  "Good to have you back, Zac. Systems are online. Pipeline is active. How may I assist?",
              }}
            />
          </div>
        )}
        {messages.map((m) => (
          <MessageRenderer
            key={m.id}
            message={m}
            onApprove={onApprove}
            onDeny={onDeny}
          />
        ))}
      </div>
    </div>
  );
}

function SplitLayout({
  state,
  messages,
  feedRef,
  activeView,
  onApprove,
  onDeny,
}: {
  state: JARVISState;
  messages: Message[];
  feedRef: React.RefObject<HTMLDivElement | null>;
  activeView: ViewId;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
      <div
        style={{
          width: 260,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          borderRight: `1px solid ${C.border}`,
          paddingTop: 16,
          overflow: "hidden",
        }}
      >
        <JarvisEye state={state} size={110} />
        <div
          className="orb"
          style={{
            fontSize: 8,
            letterSpacing: "0.22em",
            marginTop: 8,
            marginBottom: 12,
            color:
              state === "thinking"
                ? C.cyan
                : state === "speaking"
                ? C.bright
                : state === "listening"
                ? C.amber
                : C.textLow,
          }}
        >
          {SHORT_STATUS[state]}
        </div>
        <div ref={feedRef} style={{ flex: 1, overflowY: "auto", width: "100%", padding: "0 14px 8px" }}>
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {activeView === "command" && <CommandView />}
        {activeView === "news" && <NewsView />}
        {activeView === "investments" && <InvestmentsView />}
        {activeView === "leads" && <LeadsView />}
        {activeView === "tasks" && <TasksView />}
        {activeView === "intelligence" && <IntelligenceView />}
        {activeView === "log" && (
          <ConversationView
            messages={messages}
            onApprove={onApprove}
            onDeny={onDeny}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────── CommandInput ─────────── */

function CommandInput({
  input,
  setInput,
  onSend,
  isListening,
  partialTranscript,
  onToggleListen,
  voiceAlwaysOn,
  state,
  isLoading,
}: {
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  isListening: boolean;
  partialTranscript: string;
  onToggleListen: () => void;
  voiceAlwaysOn: boolean;
  state: JARVISState;
  isLoading: boolean;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  const isActive = state !== "idle";
  // Show partial transcript while listening, unless the user has started typing
  const displayValue =
    isListening && partialTranscript && input.length === 0 ? partialTranscript : input;
  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div
      style={{
        padding: "10px 16px",
        borderTop: `1px solid ${C.border}`,
        background: `linear-gradient(0deg, #0a170a 0%, transparent 100%)`,
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: C.surface,
          border: `1px solid ${isActive ? C.primary + "66" : C.border}`,
          borderRadius: 8,
          padding: "6px 8px",
          transition: "border-color .3s",
          boxShadow: isActive ? `0 0 12px ${C.primary}22` : "none",
        }}
      >
        <span className="mono" style={{ fontSize: 11, color: C.primary, paddingLeft: 4, paddingRight: 2 }}>
          ›
        </span>
        <input
          value={displayValue}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={isListening ? "Listening… (or type)" : "Command JARVIS…"}
          disabled={isLoading}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: C.text,
            fontSize: 13,
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 400,
          }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onToggleListen}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: `1px solid ${
                voiceAlwaysOn
                  ? isListening
                    ? C.amber + "66"
                    : C.primary + "66"
                  : C.border
              }`,
              background: voiceAlwaysOn
                ? isListening
                  ? `${C.amber}15`
                  : `${C.primary}15`
                : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .2s",
            }}
            title={voiceAlwaysOn ? "Voice always-on (click to disable)" : "Voice off (click to enable always-on)"}
            aria-label={voiceAlwaysOn ? "Disable always-on voice" : "Enable always-on voice"}
          >
            {voiceAlwaysOn ? (
              <Mic size={13} color={isListening ? C.amber : C.bright} />
            ) : (
              <MicOff size={13} color={C.textLow} />
            )}
          </button>
          <button
            onClick={onSend}
            disabled={!canSend}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: `1px solid ${canSend ? C.primary : C.border}`,
              background: canSend ? `${C.primary}22` : "transparent",
              cursor: canSend ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .2s",
            }}
            aria-label="Send command"
          >
            <Send size={13} color={canSend ? C.bright : C.textLow} />
          </button>
        </div>
      </div>
      <div
        className="mono"
        style={{
          fontSize: 8,
          color: C.textLow,
          textAlign: "center",
          marginTop: 5,
          letterSpacing: "0.12em",
        }}
      >
        SAY &quot;NEWS&quot;, &quot;LEADS&quot;, &quot;TASKS&quot;, &quot;INVESTMENTS&quot;, &quot;COMMAND CENTRE&quot; TO NAVIGATE
      </div>
    </div>
  );
}

/* ─────────── NavDots ─────────── */

const VIEW_ICONS: Record<ViewId, React.ReactNode> = {
  command: <Activity size={11} />,
  news: <Radio size={11} />,
  investments: <TrendingUp size={11} />,
  leads: <Users size={11} />,
  tasks: <CheckSquare size={11} />,
  intelligence: <Eye size={11} />,
  log: <MessageSquare size={11} />,
};
const VIEW_LABELS: Record<ViewId, string> = {
  command: "CMD",
  news: "NEWS",
  investments: "INV",
  leads: "LEADS",
  tasks: "TASKS",
  intelligence: "INTEL",
  log: "LOG",
};
const VIEW_IDS: ViewId[] = ["command", "news", "investments", "leads", "tasks", "intelligence", "log"];

function NavDots({
  activeView,
  onSelect,
}: {
  activeView: ViewId | null;
  onSelect: (id: ViewId | null) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        zIndex: 20,
      }}
    >
      {VIEW_IDS.map((id) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(active ? null : id)}
            title={VIEW_LABELS[id]}
            style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              border: `1px solid ${active ? C.primary : C.border}`,
              background: active ? `${C.primary}30` : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: active ? C.bright : C.textLow,
              transition: "all .2s",
            }}
          >
            {VIEW_ICONS[id]}
          </button>
        );
      })}
    </div>
  );
}
