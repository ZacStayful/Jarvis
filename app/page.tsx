"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  CheckSquare,
  Ear,
  EarOff,
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
import { detectAddressedDirector, detectMarketingCommand, type ViewRoute } from "@/lib/commandRouter";
import { useJARVIS } from "@/hooks/useJARVIS";
import { useCrossSessionContext } from "@/hooks/useCrossSessionContext";
import type { InputMode, JARVISState, Message, PersonaId } from "@/types/jarvis";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTTS, readStoredMuted } from "@/hooks/useTTS";
import { useTranscriptPersistence } from "@/hooks/useTranscriptPersistence";
import { LearningSystem, isEODCommand } from "@/components/learning/LearningSystem";
import { detectLucyCommand } from "@/lib/lucy-commands";
import { detectPortfolioCommand } from "@/lib/portfolio/commands";
import { detectSalesCommand, isSalesQuestion } from "@/lib/sales/commands";
import { buildSalesContextLine } from "@/lib/sales/context";
import { detectInvestmentCommand } from "@/lib/investment-commands";
import { pick, SALES_OPEN, LOADING, SECTION_ACK, QUERY_START, FOLLOW_UP, SILENCE_PROMPT, SALES_CLOSE, PRIORITY_PREFIX } from "@/lib/sales/voice-phrases";
import {
  isStopPhrase,
  isNoMorePhrase,
  isCategorySwitch,
  isNewsRequest,
  isSummariseRequest,
  categoryVoiceName,
} from "@/lib/voice-news-intents";
import { isPresenceCheck, presenceResponse } from "@/lib/voice-presence";
import { isLikelyEcho } from "@/lib/voice-echo-filter";
import { isCommandShaped } from "@/lib/intent-utils";
import { detectPersonaSwitch } from "@/lib/persona-commands";
import { DEFAULT_PERSONA, PERSONAS, PERSONA_IDS } from "@/lib/personas";
import { buildGreeting, handoverLine, introLine, thinkingLine, NEWS_FEED_DOWN_LINE } from "@/lib/jarvis-lines";
import { nextSpeakableChunks } from "@/lib/speech-chunks";
import { LucyView } from "@/views/LucyView";
import { SalesDashboard } from "@/components/sales/SalesDashboard";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { GlobalStyles } from "@/components/jarvis/GlobalStyles";
import { BrainNetwork } from "@/components/jarvis/BrainNetwork";
import { JarvisEye } from "@/components/jarvis/JarvisEye";
import { Bubble } from "@/components/jarvis/Bubble";
import { MessageRenderer } from "@/components/MessageRenderer";
import NewsBriefingView from "@/components/views/NewsBriefingView";
import InvestmentDashboardView from "@/components/views/InvestmentDashboardView";
import { MarketingDepartmentView } from "@/components/views/MarketingDepartmentView";
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

const GREETED_KEY = "jarvis_greeted";
const VOICE_ALWAYS_ON_KEY = "jarvis_voice_always_on";
const TALK_OVER_KEY = "jarvis_talk_over";
// How long after speech ends a final transcript is still checked for echo.
const ECHO_TAIL_MS = 2000;
// How long a silent "thinking" phase runs before a spoken filler.
const THINKING_FILLER_MS = 3000;

// Result of the navigation pass over an utterance.
interface NavResult {
  /** The message was fully handled locally — don't send it to Claude. */
  consumed: boolean;
  /** A view was opened by this utterance (passed to the prompt explicitly). */
  openedView?: string;
  /** Use the deep (Opus) model for this turn. */
  deep?: boolean;
}

export default function JarvisPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewId | null>(null);
  const [routedView, setRoutedView] = useState<ViewRoute>(null);
  const [viewParams, setViewParams] = useState<Record<string, unknown>>({});
  const [input, setInput] = useState("");
  const feedRef = useRef<HTMLDivElement | null>(null);
  // Messages older than this (restored history) are never spoken.
  const mountedAtRef = useRef<number>(Date.now());

  // ── Staff: who Zac is talking to ──────────────────────────────────────────
  // JARVIS (managing director) opens every session; Janet (ad creative
  // director) is brought in by name, by the header toggle, or by a hand-off
  // from JARVIS. Whoever comes in names themself and their title. See
  // lib/personas.ts.
  const [activePersona, setActivePersona] = useState<PersonaId>(DEFAULT_PERSONA);
  const activePersonaRef = useRef<PersonaId>(DEFAULT_PERSONA);
  activePersonaRef.current = activePersona;

  // Set when Zac switches person by voice *and* keeps talking ("Janet, how
  // are the ads doing?"). The full handover line would be cut off by the
  // ack or the reply, so the newcomer opens the next local line (or the
  // reply) with introLine instead. Cleared at the start of every utterance.
  const introPendingRef = useRef<PersonaId | null>(null);
  const takeIntro = useCallback((who: PersonaId): string | null => {
    if (introPendingRef.current !== who) return null;
    introPendingRef.current = null;
    return introLine(who);
  }, []);

  // ── Voice output ──────────────────────────────────────────────────────────
  const lastSpeechEndedAtRef = useRef(0);
  const greetingPendingRef = useRef(false);
  const greetingBlockedRef = useRef(false);
  const { speak, enqueue, stop: stopSpeaking, isSpeaking, currentText: spokenText, muted, toggleMuted } = useTTS({
    onEnd: () => {
      lastSpeechEndedAtRef.current = Date.now();
      if (greetingPendingRef.current) {
        // The only reliable "it actually played" signal — see CLAUDE.md.
        greetingPendingRef.current = false;
        greetingBlockedRef.current = false;
        try {
          window.sessionStorage.setItem(GREETED_KEY, "true");
        } catch {}
      }
    },
    onError: (err) => {
      lastSpeechEndedAtRef.current = Date.now();
      if (greetingPendingRef.current && err === "Audio playback blocked") {
        greetingBlockedRef.current = true; // re-armed on the first gesture
      }
    },
  });
  const isSpeakingRef = useRef(false);
  isSpeakingRef.current = isSpeaking;
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  // ── Cross-session memory block for the system prompt ──────────────────────
  const crossSession = useCrossSessionContext();
  const crossSessionBlock = crossSession.buildContextBlock();

  const {
    messages,
    isLoading,
    currentResponse,
    sendMessage,
    approveAction,
    denyAction,
    endSession,
    interrupt,
    addLocalAssistantMessage,
  } = useJARVIS({
    onSpeakerChange: (p) => setActivePersona(p),
    crossSessionContext: crossSessionBlock,
    persistSession: true,
  });
  const isLoadingRef = useRef(false);
  isLoadingRef.current = isLoading;
  const currentResponseRef = useRef("");
  currentResponseRef.current = currentResponse;
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Persist transcripts to localStorage on every message update
  useTranscriptPersistence(messages);

  // End-of-day learning panel overlay
  const [learningOpen, setLearningOpen] = useState(false);

  // Lucy intelligence centre
  const [lucyOpen, setLucyOpen] = useState(false);

  // Portfolio Intelligence Dashboard (mounted inline inside the JARVIS shell)
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  // Sales Intelligence Dashboard (mounted inline inside the JARVIS shell)
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesMetrics, setSalesMetrics] = useState<any>(null);
  const [salesAnswer, setSalesAnswer] = useState<string | null>(null);

  // Sales voice system refs
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingPhraseIndex = useRef(0);

  // Sales, news and the dashboards are JARVIS's remit — their canned lines
  // are always in his voice.
  const startLoadingMessages = useCallback(() => {
    loadingPhraseIndex.current = 0;
    let count = 0;
    const fire = () => {
      speak(pick(LOADING), "jarvis");
      count++;
      const next = count < 3 ? 3000 : 5000;
      loadingIntervalRef.current = setTimeout(fire, next);
    };
    loadingIntervalRef.current = setTimeout(fire, 3000);
  }, [speak]);

  const stopLoadingMessages = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearTimeout(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  // Centralised "switch view" helper — every nav intent must clear its
  // siblings first, otherwise the render precedence makes the first-opened
  // view sticky (see the ternary chain in the render tree).
  const clearAllViews = useCallback(() => {
    setActiveView(null);
    setRoutedView(null);
    setLucyOpen(false);
    setPortfolioOpen(false);
    setSalesOpen(false);
    stopLoadingMessages();
    setSalesMetrics(null);
    setSalesAnswer(null);
    setNewsActiveCategory(undefined);
    setNewsCategoriesFilter(undefined);
    loadedArticlesRef.current = null;
    awaitingNewsCategoryRef.current = false;
    // learningOpen is an overlay — intentionally left alone so EOD can
    // layer over whatever's currently in the shell.
  }, [stopLoadingMessages]);

  const handleSalesVoiceQuery = useCallback(async (text: string) => {
    if (!salesMetrics) return;
    stopSpeaking();
    const intro = takeIntro("jarvis");
    speak(intro ? `${intro} ${pick(QUERY_START)}` : pick(QUERY_START), "jarvis");
    startLoadingMessages();
    try {
      const res = await fetch('/api/sales/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: salesMetrics, question: text }),
      });
      const data = await res.json();
      stopLoadingMessages();
      if (data.summary) {
        setSalesAnswer(data.summary);
        if (!mutedRef.current) {
          speak(data.summary, "jarvis");
          // After speaking, offer a follow-up
          if (data.followUp) {
            enqueue(pick(FOLLOW_UP), "jarvis");
          }
        }
      }
    } catch {
      stopLoadingMessages();
      speak("I encountered an error, sir. Please try again.", "jarvis");
    }
  }, [salesMetrics, speak, enqueue, stopSpeaking, startLoadingMessages, stopLoadingMessages, takeIntro]);

  const handleSectionFocus = useCallback(async (sectionId: string, metrics: any) => {
    stopSpeaking();
    speak(pick(SECTION_ACK[sectionId] || SECTION_ACK.funnel), "jarvis");
    // Generate proactive contextual observation
    try {
      const res = await fetch('/api/sales/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, sectionId }),
      });
      const data = await res.json();
      if (data.summary && !mutedRef.current) {
        enqueue(data.summary, "jarvis");
      }
    } catch {}
  }, [speak, enqueue, stopSpeaking]);

  // ── Speech bookkeeping ────────────────────────────────────────────────────
  // Which message ids have been fully spoken (or must never be spoken).
  const spokenIdsRef = useRef<Set<string>>(new Set());
  // Streaming cursor per message id: how much of its text is already queued.
  const spokenUpToRef = useRef<Map<string, number>>(new Map());
  // A message whose remaining speech Zac cut off by talking over it.
  const cancelledSpeechRef = useRef<string | null>(null);

  // Add a UI-only line to the feed and say it, in one go.
  const say = useCallback(
    (text: string, speaker: PersonaId) => {
      const intro = takeIntro(speaker);
      const line = intro ? `${intro} ${text}` : text;
      const id = addLocalAssistantMessage(line, speaker);
      spokenIdsRef.current.add(id);
      speak(line, speaker);
    },
    [addLocalAssistantMessage, speak, takeIntro]
  );

  // News-conversation state: cached articles + controlled UI filter.
  const loadedArticlesRef = useRef<unknown[] | null>(null);
  const [newsActiveCategory, setNewsActiveCategory] = useState<string | undefined>(undefined);

  // Category filter for the upstream /api/news fetch. When set, the
  // briefing only loads that category instead of all 8 — much faster.
  const [newsCategoriesFilter, setNewsCategoriesFilter] = useState<string[] | undefined>(undefined);

  // True after "open news" with no category — next transcript is
  // interpreted as a category selection.
  const awaitingNewsCategoryRef = useRef(false);

  // ── Speak replies as they stream ──────────────────────────────────────────
  // Every assistant message that hasn't been spoken yet is fed to the TTS
  // queue sentence by sentence while it streams, then flushed when it
  // finishes. A hand-off produces two messages back to back, each spoken in
  // its own voice. Restored history (older than mount) is never spoken.
  useEffect(() => {
    if (muted) return;
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      if (spokenIdsRef.current.has(m.id)) continue;
      if (m.timestamp.getTime() < mountedAtRef.current) {
        spokenIdsRef.current.add(m.id);
        continue;
      }
      if (cancelledSpeechRef.current === m.id) {
        if (!m.isStreaming) spokenIdsRef.current.add(m.id);
        continue;
      }
      const speaker = m.speaker ?? DEFAULT_PERSONA;

      if (m.local) {
        // Greeting / handover lines were spoken by whoever added them.
        // Error notices and announced notices (approval outcomes) arrive
        // here and are spoken now, as an interrupt.
        spokenIdsRef.current.add(m.id);
        if (m.type === "text" && (m.errorDetail || m.announce)) speak(m.content, speaker);
        continue;
      }

      const upTo = spokenUpToRef.current.get(m.id) ?? 0;
      if (m.isStreaming) {
        const { chunks, upTo: next } = nextSpeakableChunks(m.content, upTo, { first: upTo === 0 });
        if (chunks.length) {
          for (const chunk of chunks) enqueue(chunk, speaker);
          spokenUpToRef.current.set(m.id, next);
        }
      } else {
        const { chunks } = nextSpeakableChunks(m.content, upTo, { first: upTo === 0, final: true });
        for (const chunk of chunks) enqueue(chunk, speaker);
        spokenIdsRef.current.add(m.id);
        spokenUpToRef.current.delete(m.id);
      }
    }
  }, [messages, muted, enqueue, speak]);

  // ── Thinking filler ───────────────────────────────────────────────────────
  // If a reply hasn't started arriving after a few seconds, say so briefly.
  // The first streamed sentence is queued after the filler, not over it.
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => {
      if (
        isLoadingRef.current &&
        currentResponseRef.current === "" &&
        !isSpeakingRef.current &&
        !mutedRef.current
      ) {
        speak(thinkingLine(activePersonaRef.current), activePersonaRef.current);
      }
    }, THINKING_FILLER_MS);
    return () => clearTimeout(t);
  }, [isLoading, speak]);

  // ── Greeting on open ──────────────────────────────────────────────────────
  // Instant and local (no Claude round-trip): JARVIS's time-of-day line goes
  // into the feed on every mount; it is spoken once per tab session, and the
  // "spoken" flag is only set when playback actually finished (onEnd). If
  // autoplay is blocked, the first keypress or tap plays it.
  const greetingAddedRef = useRef(false);
  const greetingTextRef = useRef("");
  useEffect(() => {
    if (!greetingAddedRef.current) {
      greetingAddedRef.current = true;
      greetingTextRef.current = buildGreeting(DEFAULT_PERSONA);
      const id = addLocalAssistantMessage(greetingTextRef.current, DEFAULT_PERSONA);
      spokenIdsRef.current.add(id);
    }
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(GREETED_KEY) === "true") return;
    } catch {}
    if (readStoredMuted()) return;

    const line = greetingTextRef.current;
    greetingPendingRef.current = true;
    let gestureUsed = false;

    const onGesture = () => {
      if (gestureUsed || !greetingPendingRef.current || !greetingBlockedRef.current) return;
      gestureUsed = true;
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
      greetingBlockedRef.current = false;
      speak(line, DEFAULT_PERSONA);
    };

    const t = window.setTimeout(() => {
      if (greetingPendingRef.current && !gestureUsed) speak(line, DEFAULT_PERSONA);
    }, 600);

    window.addEventListener("keydown", onGesture);
    window.addEventListener("pointerdown", onGesture);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
    };
  }, [addLocalAssistantMessage, speak]);

  // Escape stops in-flight voice playback (the reply keeps arriving as text)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      stopSpeaking();
      const streaming = messagesRef.current.find((m) => m.isStreaming);
      if (streaming) cancelledSpeechRef.current = streaming.id;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stopSpeaking]);

  // Sales: silence prompt every 30s of idle when dashboard is open
  useEffect(() => {
    if (!salesOpen) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      return;
    }
    const reset = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (!isSpeakingRef.current && !mutedRef.current) speak(pick(SILENCE_PROMPT), "jarvis");
      }, 30000);
    };
    reset();
    window.addEventListener('click', reset);
    return () => {
      window.removeEventListener('click', reset);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [salesOpen, speak]);

  // Sales: auto-briefing when dashboard opens AND metrics load
  useEffect(() => {
    if (!salesOpen || !salesMetrics || muted) return;
    const timer = setTimeout(async () => {
      stopLoadingMessages();
      try {
        // Check for priority alerts first
        const urgentOffers = salesMetrics.offers?.expiringThisWeek > 0;
        if (urgentOffers) {
          speak(pick(PRIORITY_PREFIX) + " " + salesMetrics.offers.expiringThisWeek + " offer" + (salesMetrics.offers.expiringThisWeek > 1 ? "s" : "") + " expiring this week.", "jarvis");
        }
        const res = await fetch('/api/sales/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: salesMetrics }),
        });
        const data = await res.json();
        if (data.summary && !mutedRef.current) {
          if (urgentOffers) enqueue(data.summary, "jarvis");
          else speak(data.summary, "jarvis");
        }
      } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [salesOpen, salesMetrics, muted, speak, enqueue, stopLoadingMessages]);

  // Summarise the session into cross-session memory when the tab is hidden
  // or closed. `beforeunload` fetches are routinely killed by the browser;
  // visibilitychange + pagehide with a keepalive request is what survives.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") endSession().catch(() => {});
    };
    const onPageHide = () => {
      endSession().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [endSession]);

  // ── Voice input ───────────────────────────────────────────────────────────
  // Always-on voice on desktop (persisted). On touch devices continuous
  // recognition is unreliable and autoplay is strict, so the default there
  // is tap-to-talk.
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [voiceAlwaysOn, setVoiceAlwaysOn] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    setIsTouchDevice(touch);
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(VOICE_ALWAYS_ON_KEY);
    } catch {}
    setVoiceAlwaysOn(stored !== null ? stored === "true" : !touch);
  }, []);
  const toggleVoiceAlwaysOn = () => {
    const next = !voiceAlwaysOn;
    setVoiceAlwaysOn(next);
    try {
      window.localStorage.setItem(VOICE_ALWAYS_ON_KEY, String(next));
    } catch {}
  };

  // Talk-over: keep the mic live while JARVIS speaks so Zac can interrupt
  // him by voice. OFF by default and opt-in for headphones: on speakers the
  // recogniser hears JARVIS's own voice back with small differences
  // (digits, "£27", dropped "sir") that the echo filter cannot always
  // catch, so he interrupts himself and then answers his own words. With
  // talk-over off, Escape, typing and the mic button still interrupt.
  const [talkOver, setTalkOver] = useState(false);
  useEffect(() => {
    try {
      setTalkOver(window.localStorage.getItem(TALK_OVER_KEY) === "true");
    } catch {}
  }, []);
  const toggleTalkOver = () => {
    const next = !talkOver;
    setTalkOver(next);
    try {
      window.localStorage.setItem(TALK_OVER_KEY, String(next));
    } catch {}
  };

  const { startListening, stopListening, isListening, partialTranscript } = useVoiceInput({
    onFinalTranscript: (text) => {
      // Echo filter: while JARVIS is speaking (and for a moment after), a
      // transcript that matches what he just said is his own voice coming
      // back through the mic. Once that window has passed, accept everything
      // — a real answer that shares words with the question must get through
      // (the "political news" case; see CLAUDE.md).
      const recentlySpoke =
        isSpeakingRef.current || Date.now() - lastSpeechEndedAtRef.current < ECHO_TAIL_MS;
      if (recentlySpoke && isLikelyEcho(text, spokenText)) return;
      handleUtterance(text, "voice");
    },
  });

  // Barge-in (talk-over on only): stop in-flight speech the moment the
  // recogniser hears Zac start talking. partialTranscript fires as interim
  // results arrive — much earlier than onFinalTranscript (which waits for
  // silence). The echo filter discards partials that are our own voice via
  // mic bleed-through; with talk-over off the mic is not live during speech
  // and this never fires.
  useEffect(() => {
    if (!isSpeaking || !talkOver) return;
    const partial = partialTranscript.trim();
    if (partial.length === 0) return;
    if (isLikelyEcho(partial, spokenText)) return;
    stopSpeaking();
    const streaming = messagesRef.current.find((m) => m.isStreaming);
    if (streaming) cancelledSpeechRef.current = streaming.id;
  }, [partialTranscript, isSpeaking, talkOver, stopSpeaking, spokenText]);

  // Fetch a Claude-written voice summary of the briefing (or a category
  // subset) and speak it.
  const fetchAndSpeakNewsSummary = useCallback(
    async (articles: unknown[], category: string | null) => {
      try {
        const res = await fetch("/api/news/voice-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articles, category }),
        });
        if (!res.ok) {
          if (!mutedRef.current) speak(NEWS_FEED_DOWN_LINE, "jarvis");
          return;
        }
        const { summary } = (await res.json()) as { summary: string };
        if (summary && !mutedRef.current) speak(summary, "jarvis");
      } catch {
        if (!mutedRef.current) speak(NEWS_FEED_DOWN_LINE, "jarvis");
      }
    },
    [speak]
  );

  // ── Staff switching ───────────────────────────────────────────────────────
  // Returns true when the speaker actually changed. `announce` speaks the
  // handover line (name + job title); the silent form is for callers that
  // speak their own ack — see ackAs.
  const switchPersona = useCallback(
    (next: PersonaId, announce = true): boolean => {
      if (next === activePersonaRef.current) return false;
      setActivePersona(next);
      activePersonaRef.current = next;
      if (announce && !mutedRef.current) say(handoverLine(next), next);
      else if (announce) addLocalAssistantMessage(handoverLine(next), next);
      return true;
    },
    [say, addLocalAssistantMessage]
  );

  // A nav ack spoken as `who`. If that changes who Zac is talking to, the
  // newcomer names themself and their job title first: "Janet, ad creative
  // director. Pulling up the department, Zac." Acks are spoken, not bubbled;
  // muted, only the introduction lands in the feed.
  const ackAs = useCallback(
    (who: PersonaId, ack: string | null) => {
      const intro = switchPersona(who, false) ? introLine(who) : takeIntro(who);
      if (mutedRef.current) {
        if (intro) addLocalAssistantMessage(intro, who);
        return;
      }
      const line = [intro, ack].filter(Boolean).join(" ");
      if (line) speak(line, who);
    },
    [switchPersona, addLocalAssistantMessage, speak, takeIntro]
  );

  // Marketing department — "how are the ads doing?", "which ads are
  // weakening?", "department briefing". Runs before the news handler because
  // "briefing" would otherwise be read as a news request. Opens the
  // department view (read-only stayful-ads data beside the chat) and routes
  // the question to Janet unless JARVIS was named: the ads are her remit,
  // the budget and scaling decision his, and either hands over as needed.
  const handleMarketingRequest = (
    text: string,
    persona: PersonaId
  ): { persona: PersonaId; justOpened: boolean } | null => {
    if (!detectMarketingCommand(text)) return null;
    const addressed = detectAddressedDirector(text);
    const who: PersonaId = addressed === "jarvis" ? "jarvis" : addressed === "janet" ? "janet" : persona === "jarvis" ? "janet" : persona;
    let justOpened = false;
    if (routedView !== "marketing-department") {
      clearAllViews();
      setRoutedView("marketing-department");
      justOpened = true;
    }
    ackAs(
      who,
      justOpened
        ? who === "janet" ? "Pulling up the department, Zac." : "Opening the marketing department, sir."
        : null
    );
    return { persona: who, justOpened };
  };

  // Intercept transcripts while the news briefing view is mounted.
  // Handles stop/no-more interruptions during summary playback.
  const handleNewsConversation = (text: string): boolean => {
    if (routedView !== "news-briefing") return false;

    // "nothing" / "no more" — close view, hand back to dashboard
    if (isNoMorePhrase(text)) {
      clearAllViews();
      if (!muted) speak("Awaiting further commands, sir.", "jarvis");
      return true;
    }

    // "stop" / "wait" — ack and wait for follow-up
    if (isStopPhrase(text)) {
      stopSpeaking();
      if (!muted) speak("Stopped, sir. What else would you like to cover?", "jarvis");
      return true;
    }

    return false;
  };

  // News request handler — runs BEFORE applyNavIntents so news intents
  // are resolved locally (briefing opens instantly, only the requested
  // category is fetched, no Claude round-trip needed for routing).
  //
  //   1. Explicit news intent + category ("AI news", "take me to political
  //      news") → open briefing filtered to it.
  //   2. Explicit news intent without category ("open the briefing") →
  //      ask "what type?" and arm awaitingNewsCategoryRef.
  //   3. Awaiting-category mode and a category is named → load it.
  //   4. Briefing already open + a category *switch* ("switch to AI news",
  //      "property", "what about rates") → switch and refetch. A sentence
  //      that merely contains a category word ("what does this mean for our
  //      business?") goes to Claude.
  const handleNewsRequest = (text: string): boolean => {
    const hasNewsIntent = isNewsRequest(text);
    const hasSummariseIntent = isSummariseRequest(text);
    const briefingOpen = routedView === "news-briefing";
    const awaiting = awaitingNewsCategoryRef.current;
    const category = isCategorySwitch(text, awaiting || hasNewsIntent);

    // Clear awaiting state on ANY input so we don't get stuck in it
    if (awaiting) awaitingNewsCategoryRef.current = false;

    // SUMMARISE while briefing is already open — re-speak a summary of
    // whatever's currently on screen instead of asking "what type?".
    if (
      briefingOpen &&
      hasSummariseIntent &&
      (!category || category === newsActiveCategory)
    ) {
      const articles = loadedArticlesRef.current;
      if (articles && articles.length > 0) {
        fetchAndSpeakNewsSummary(articles, newsActiveCategory ?? null);
      } else if (!muted) {
        speak("One moment, sir — still pulling the feeds.", "jarvis");
      }
      return true;
    }

    // Cases 1, 3, 4 — a category switch in a news context
    if (category && (hasNewsIntent || awaiting || briefingOpen)) {
      if (!briefingOpen) {
        clearAllViews();
      }
      setNewsCategoriesFilter([category]);
      setNewsActiveCategory(category);
      setRoutedView("news-briefing");
      ackAs("jarvis", `Pulling up the latest ${categoryVoiceName(category)}, sir.`);
      return true;
    }

    // Case 2 — news intent, no category → ask which one
    if (hasNewsIntent) {
      awaitingNewsCategoryRef.current = true;
      ackAs(
        "jarvis",
        "What type of news would you like, sir? AI, political, regulatory, rates, property, competition, international, or UK business?"
      );
      return true;
    }

    return false;
  };

  // Which view the prompt should be told about right now.
  const currentViewId = (): string | undefined => {
    if (portfolioOpen) return "portfolio-dashboard";
    if (salesOpen) return "sales-dashboard";
    if (lucyOpen) return "lucy-intelligence-centre";
    if (routedView) return routedView;
    if (activeView) return activeView;
    return undefined;
  };

  // Shared nav-intent handler used by both voice and text paths. Detect
  // every possible intent, clear competing views once, then set the winner.
  // Priority: sales > portfolio > lucy > investment dashboard > legacy pane.
  // EOD is an overlay and doesn't disturb the underlying view.
  const applyNavIntents = (text: string): NavResult => {
    if (isEODCommand(text)) setLearningOpen(true);

    // Sales view: close / sales questions / everything else to Claude
    if (salesOpen) {
      if (isCommandShaped(text) && /\b(close|back|home|exit)\b/i.test(text)) {
        stopSpeaking();
        speak(pick(SALES_CLOSE), "jarvis");
        clearAllViews();
        return { consumed: true };
      }
      const navWord = /\b(news|lucy|portfolio|leads|tasks|command|investments?)\b/i.test(text);
      if (!navWord && salesMetrics && isSalesQuestion(text)) {
        handleSalesVoiceQuery(text);
        return { consumed: true };
      }
      // Otherwise fall through: a nav command, or a general question that
      // goes to Claude with the live metrics attached.
    }

    const sales = detectSalesCommand(text);
    if (sales === 'navigate') {
      clearAllViews();
      stopSpeaking();
      ackAs("jarvis", pick(SALES_OPEN));
      setSalesOpen(true);
      startLoadingMessages();
      return { consumed: true }; // the dashboard narrates itself
    }

    const lucy = detectLucyCommand(text);
    const portfolio = detectPortfolioCommand(text);
    const investment = !portfolio ? detectInvestmentCommand(text) : null;
    const route = !portfolio && !investment ? routeCommand(text) : null;

    if (lucy !== 'navigate' && !portfolio && !investment && !route) {
      return { consumed: false };
    }

    clearAllViews();

    let ack: string | null = null;
    let openedView: string | undefined;
    let deep = false;
    if (portfolio) {
      setPortfolioOpen(true);
      ack = "Opening portfolio dashboard, sir.";
      openedView = "portfolio-dashboard";
    } else if (lucy === 'navigate') {
      setLucyOpen(true);
      ack = "Opening Lucy intelligence centre.";
      openedView = "lucy-intelligence-centre";
    } else if (investment) {
      setRoutedView("investment-dashboard");
      setViewParams({ query: investment.query });
      ack = "Opening the investment dashboard.";
      openedView = "investment-dashboard";
      deep = true;
    } else if (route) {
      setActiveView(route);
      openedView = route;
      ack =
        route === "tasks" ? "Opening task centre." :
        route === "command" ? "Opening command centre." :
        route === "intelligence" ? "Opening the intelligence view." :
        route === "log" ? "Opening the conversation log." :
        null;
    }

    // These are all JARVIS's dashboards. The ack is instant; Claude's reply
    // is queued after it rather than muted (see the streaming effect).
    stopSpeaking();
    ackAs("jarvis", ack);
    return { consumed: false, openedView, deep };
  };

  // ── The one chain every utterance goes through (voice and typed) ──────────
  //
  //   talk-over (stop speech, abort an in-flight reply)
  //     ↓
  //   persona switch / address ("switch to Janet", "Janet, …")
  //     ↓
  //   presence check ("are you there?")           → instant local line
  //     ↓
  //   marketing request ("how are the ads doing?") → department view + Janet/JARVIS
  //     ↓
  //   news request / news conversation           → local news flow
  //     ↓
  //   nav intents (sales, portfolio, lucy, investments, panes)
  //     ↓
  //   sendMessage → Claude, as whoever is active, with the view context
  const handleUtterance = (text: string, inputMode: InputMode) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Talk-over: whatever is playing stops, and a reply still streaming is
    // cut short so the new message is answered instead.
    stopSpeaking();
    const streaming = messagesRef.current.find((m) => m.isStreaming);
    if (streaming) cancelledSpeechRef.current = streaming.id;
    if (isLoadingRef.current) interrupt();

    // Who is being spoken to?
    let persona = activePersonaRef.current;
    let message = trimmed;
    introPendingRef.current = null;
    const sw = detectPersonaSwitch(trimmed, persona);
    if (sw) {
      // A bare "switch to Janet" gets the full handover line as the reply.
      // With a question attached, the newcomer introduces themself in a few
      // words at the front of whatever is said next (see takeIntro).
      const switched = switchPersona(sw.persona, !sw.remainder);
      persona = sw.persona;
      if (!sw.remainder) return;
      if (switched) introPendingRef.current = sw.persona;
      message = sw.remainder;
    }

    if (isPresenceCheck(message)) {
      say(presenceResponse(persona), persona);
      return;
    }

    const marketing = handleMarketingRequest(message, persona);
    if (marketing) {
      sendMessage(message, false, {
        inputMode,
        persona: marketing.persona,
        activeView: "marketing-department",
        viewJustOpened: marketing.justOpened,
      });
      return;
    }

    if (handleNewsRequest(message)) return;
    if (handleNewsConversation(message)) return;

    const nav = applyNavIntents(message);
    if (nav.consumed) return;

    // A dashboard open was always JARVIS's doing.
    if (nav.openedView) persona = "jarvis";

    const viewNow = nav.openedView ?? currentViewId();
    const viewContext =
      viewNow === "sales-dashboard" ? buildSalesContextLine(salesMetrics) : undefined;

    // "Janet, what do you make of this hook?" — nothing local spoke, so the
    // introduction plays now and the reply queues behind it.
    const intro = takeIntro(persona);
    if (intro) say(intro, persona);

    sendMessage(message, nav.deep ?? false, {
      inputMode,
      persona,
      activeView: viewNow,
      viewJustOpened: !!nav.openedView,
      viewContext,
    });
  };

  // Combined visual state: speaking > thinking > listening > idle.
  const state: JARVISState = isSpeaking
    ? "speaking"
    : isLoading
    ? "thinking"
    : isListening
    ? "listening"
    : "idle";

  // Mic policy. The mic is off while JARVIS is *thinking* (a reply requested
  // but nothing spoken yet — otherwise what Zac said would be dropped by the
  // in-flight guard) and, unless talk-over is on, while he is *speaking*
  // (on speakers the mic hears him and he would interrupt himself). It
  // re-arms shortly after speech ends; the 2 s echo tail on finals covers
  // the last syllables still in the air.
  const isThinking = isLoading && !isSpeaking;
  const micOff = isThinking || (isSpeaking && !talkOver);
  useEffect(() => {
    if (!voiceAlwaysOn) {
      if (isListening) stopListening();
      return;
    }
    if (micOff) {
      if (isListening) stopListening();
      return;
    }
    if (!isListening) {
      const t = setTimeout(() => {
        startListening().catch(() => {});
      }, 600);
      return () => clearTimeout(t);
    }
  }, [voiceAlwaysOn, micOff, isListening, startListening, stopListening]);

  // Auto-scroll message feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const txt = input.trim();
    if (!txt) return;
    if (isThinking) return; // typed input is disabled while thinking anyway
    setInput("");
    handleUtterance(txt, "text");
  };

  // Tap-to-talk (touch devices with always-on off): one utterance per tap.
  const handleMicButton = () => {
    if (isTouchDevice && !voiceAlwaysOn) {
      if (isListening) stopListening();
      else {
        stopSpeaking();
        startListening().catch(() => {});
      }
      return;
    }
    toggleVoiceAlwaysOn();
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
        talkOver={talkOver}
        onToggleTalkOver={toggleTalkOver}
        persona={activePersona}
        onSwitchPersona={(p) => switchPersona(p, true)}
      />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>
        {portfolioOpen ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex" }}>
            <PortfolioView />
          </div>
        ) : salesOpen ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <SalesDashboard
              onMetricsLoaded={(metrics) => {
                setSalesMetrics(metrics);
                stopLoadingMessages();
              }}
              externalAnswer={salesAnswer}
              onSectionFocus={handleSectionFocus}
            />
          </div>
        ) : lucyOpen ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <LucyView />
          </div>
        ) : routedView === "marketing-department" ? (
          <MarketingDepartmentView messages={messages} state={state} feedRef={feedRef} />
        ) : routedView === "news-briefing" ? (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <NewsBriefingView
              key={newsCategoriesFilter?.join(",") ?? "all"}
              autoFetch
              initialCategories={newsCategoriesFilter}
              activeCategory={newsActiveCategory}
              onComplete={(articles) => {
                loadedArticlesRef.current = articles;
                if (articles.length === 0) return;
                fetchAndSpeakNewsSummary(articles, newsActiveCategory ?? null);
              }}
              onError={() => {
                if (!mutedRef.current) speak(NEWS_FEED_DOWN_LINE, "jarvis");
              }}
            />
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
        onMicButton={handleMicButton}
        voiceAlwaysOn={voiceAlwaysOn}
        tapToTalk={isTouchDevice && !voiceAlwaysOn}
        state={state}
        inputDisabled={isThinking}
        persona={activePersona}
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
  talkOver,
  onToggleTalkOver,
  persona,
  onSwitchPersona,
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
  talkOver: boolean;
  onToggleTalkOver: () => void;
  persona: PersonaId;
  onSwitchPersona: (p: PersonaId) => void;
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
        <span style={{ width: 1, height: 14, background: C.border }} />
        {/* Staff toggle — who Zac is talking to */}
        <div style={{ display: "flex", gap: 4 }} role="group" aria-label="Who you are talking to">
          {PERSONA_IDS.map((id) => {
            const active = id === persona;
            return (
              <button
                key={id}
                onClick={() => onSwitchPersona(id)}
                className="mono"
                title={`${PERSONAS[id].name} — ${PERSONAS[id].title}`}
                aria-pressed={active}
                style={{
                  fontSize: 9,
                  letterSpacing: "0.15em",
                  background: active ? `${C.primary}22` : "none",
                  border: `1px solid ${active ? C.primary : C.border}`,
                  color: active ? C.bright : C.textLow,
                  padding: "3px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {PERSONAS[id].name.toUpperCase()}
              </button>
            );
          })}
        </div>
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
          onClick={onToggleTalkOver}
          title={
            talkOver
              ? "Talk-over on: mic stays live while JARVIS speaks (headphones). Click to turn off."
              : "Talk-over off: mic pauses while JARVIS speaks. Turn on with headphones to interrupt by voice."
          }
          aria-label={talkOver ? "Turn talk-over off" : "Turn talk-over on"}
          aria-pressed={talkOver}
          style={{
            background: "none",
            border: `1px solid ${talkOver ? C.primary + "66" : C.border}`,
            color: talkOver ? C.bright : C.textLow,
            padding: "3px 6px",
            borderRadius: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          {talkOver ? <Ear size={12} /> : <EarOff size={12} />}
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
  onMicButton,
  voiceAlwaysOn,
  tapToTalk,
  state,
  inputDisabled,
  persona,
}: {
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  isListening: boolean;
  partialTranscript: string;
  onMicButton: () => void;
  voiceAlwaysOn: boolean;
  tapToTalk: boolean;
  state: JARVISState;
  inputDisabled: boolean;
  persona: PersonaId;
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
  const canSend = input.trim().length > 0 && !inputDisabled;
  const micOn = voiceAlwaysOn || (tapToTalk && isListening);
  const micTitle = tapToTalk
    ? isListening
      ? "Listening — tap to stop"
      : "Tap to talk"
    : voiceAlwaysOn
    ? "Voice always-on (click to disable)"
    : "Voice off (click to enable always-on)";

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
          placeholder={
            isListening
              ? "Listening… (or type)"
              : `Ask ${PERSONAS[persona].name} anything…`
          }
          disabled={inputDisabled}
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
            onClick={onMicButton}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: `1px solid ${
                micOn
                  ? isListening
                    ? C.amber + "66"
                    : C.primary + "66"
                  : C.border
              }`,
              background: micOn
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
            title={micTitle}
            aria-label={micTitle}
          >
            {micOn ? (
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
        {tapToTalk
          ? "TAP THE MIC TO TALK · ASK JARVIS OR JANET ANYTHING"
          : "ASK JARVIS OR JANET ANYTHING · SAY \"NEWS\", \"LEADS\", \"PORTFOLIO\" OR \"SALES\" TO NAVIGATE"}
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
