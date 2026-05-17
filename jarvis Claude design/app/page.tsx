"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import JarvisEye from "@/components/JarvisEye";
import ChatInterface from "@/components/ChatInterface";
import StatusBar from "@/components/StatusBar";
import styles from "./page.module.css";

export type JarvisState = "idle" | "listening" | "thinking" | "speaking";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function JarvisPage() {
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const router = useRouter();
  const messagesRef = useRef<Message[]>([]);

  // Keep ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Boot sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setBootComplete(true);
      // Welcome message
      const welcome: Message = {
        id: "welcome",
        role: "assistant",
        content:
          "Good to have you back, Zac. Systems are online. What do you need?",
        timestamp: new Date(),
      };
      setMessages([welcome]);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || !content.trim()) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      const updatedMessages = [...messagesRef.current, userMsg];
      setMessages(updatedMessages);
      setJarvisState("thinking");
      setIsStreaming(true);

      // Prepare assistant message placeholder
      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) throw new Error("API error");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No reader");

        setJarvisState("speaking");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: m.content + data.text }
                        : m
                    )
                  );
                }
                if (data.done || data.error) break;
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    "I encountered an error processing that request. Please try again.",
                }
              : m
          )
        );
      } finally {
        setJarvisState("idle");
        setIsStreaming(false);
      }
    },
    [isStreaming]
  );

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  return (
    <div className={`${styles.container} ${bootComplete ? styles.booted : ""}`}>
      {/* Background elements */}
      <div className={styles.bgGrid} />
      <div className={styles.bgVignette} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerBrand}>JARVIS</span>
          <span className={styles.headerSub}>STAYFUL COMMAND CENTRE</span>
        </div>
        <div className={styles.headerRight}>
          <div
            className={`${styles.statusDot} ${jarvisState !== "idle" ? styles.statusDotActive : ""}`}
          />
          <span className={styles.statusLabel}>
            {jarvisState === "idle" && "STANDBY"}
            {jarvisState === "listening" && "LISTENING"}
            {jarvisState === "thinking" && "PROCESSING"}
            {jarvisState === "speaking" && "RESPONDING"}
          </span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            DISCONNECT
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className={styles.main}>
        {/* Eye column */}
        <div className={styles.eyeColumn}>
          <JarvisEye state={jarvisState} />

          {/* System status indicators */}
          <div className={styles.systemStatus}>
            <StatusItem label="CLAUDE API" status="online" />
            <StatusItem label="VOICE IN" status="phase2" />
            <StatusItem label="VOICE OUT" status="phase2" />
            <StatusItem label="MONDAY.COM" status="phase4" />
            <StatusItem label="GMAIL" status="phase4" />
            <StatusItem label="LUCY" status="phase7" />
          </div>
        </div>

        {/* Chat column */}
        <div className={styles.chatColumn}>
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isStreaming={isStreaming}
            jarvisState={jarvisState}
          />
        </div>
      </main>

      {/* Status bar */}
      <StatusBar jarvisState={jarvisState} messageCount={messages.length} />
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
