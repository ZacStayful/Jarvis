"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import JarvisEye from "@/components/JarvisEye";
import ChatInterface from "@/components/ChatInterface";
import StatusBar from "@/components/StatusBar";
import { useJARVIS, type Message as HookMessage, type JARVISState } from "@/hooks/useJARVIS";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import styles from "./page.module.css";

export type JarvisState = JARVISState;
export type Message = HookMessage;

export default function JarvisPage() {
  const [bootComplete, setBootComplete] = useState(false);
  const router = useRouter();

  const {
    messages,
    jarvisState,
    isLoading,
    sendMessage,
    setMessages,
  } = useJARVIS();

  const {
    startListening,
    stopListening,
    isListening,
    partialTranscript,
    voiceState,
  } = useVoiceInput({
    onFinalTranscript: (text) => sendMessage(text),
  });

  // Boot sequence + welcome
  useEffect(() => {
    const timer = setTimeout(() => {
      setBootComplete(true);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Good to have you back, Zac. Systems are online. What do you need?",
          timestamp: new Date(),
        },
      ]);
    }, 1200);
    return () => clearTimeout(timer);
  }, [setMessages]);

  // Combined visual state: voice listening overrides JARVIS state
  const displayState: JarvisState = isListening ? "listening" : jarvisState;

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  return (
    <div className={`${styles.container} ${bootComplete ? styles.booted : ""}`}>
      <div className={styles.bgGrid} />
      <div className={styles.bgVignette} />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerBrand}>JARVIS</span>
          <span className={styles.headerSub}>STAYFUL COMMAND CENTRE</span>
        </div>
        <div className={styles.headerRight}>
          <div
            className={`${styles.statusDot} ${displayState !== "idle" ? styles.statusDotActive : ""}`}
          />
          <span className={styles.statusLabel}>
            {displayState === "idle" && "STANDBY"}
            {displayState === "listening" && "LISTENING"}
            {displayState === "thinking" && "PROCESSING"}
            {displayState === "speaking" && "RESPONDING"}
          </span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            DISCONNECT
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.eyeColumn}>
          <JarvisEye state={displayState} />

          <div className={styles.systemStatus}>
            <StatusItem label="CLAUDE API" status="online" />
            <StatusItem label="VOICE IN" status="online" />
            <StatusItem label="VOICE OUT" status="phase2" />
            <StatusItem label="MONDAY.COM" status="phase4" />
            <StatusItem label="GMAIL" status="phase4" />
            <StatusItem label="LUCY" status="phase7" />
          </div>
        </div>

        <div className={styles.chatColumn}>
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isStreaming={isLoading}
            jarvisState={displayState}
            isListening={isListening}
            partialTranscript={partialTranscript}
            voiceState={voiceState}
            onToggleVoice={isListening ? stopListening : startListening}
          />
        </div>
      </main>

      <StatusBar jarvisState={displayState} messageCount={messages.length} />
    </div>
  );
}

function StatusItem({
  label,
  status,
}: {
  label: string;
  status: "online" | "offline" | "phase2" | "phase4" | "phase7";
}) {
  const statusColors = {
    online: "var(--green-bright)",
    offline: "var(--red)",
    phase2: "var(--amber)",
    phase4: "var(--amber)",
    phase7: "var(--amber)",
  };

  const statusLabels = {
    online: "ONLINE",
    offline: "OFFLINE",
    phase2: "PH.2",
    phase4: "PH.4",
    phase7: "PH.7",
  };

  return (
    <div className="status-item" style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: statusColors[status],
          boxShadow: `0 0 6px ${statusColors[status]}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--white-muted)",
          letterSpacing: "1px",
          flex: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: statusColors[status],
          letterSpacing: "1px",
        }}
      >
        {statusLabels[status]}
      </span>
    </div>
  );
}
