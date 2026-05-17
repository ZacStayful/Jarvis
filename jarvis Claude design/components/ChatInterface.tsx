"use client";

import { useEffect, useRef, useState } from "react";
import { Message, JarvisState } from "@/app/page";
import styles from "./ChatInterface.module.css";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isStreaming: boolean;
  jarvisState: JarvisState;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isStreaming,
  jarvisState,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerLabel}>COMMAND INTERFACE</span>
        <span className={styles.messageCount}>{messages.length} ENTRIES</span>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>◈</div>
            <p>Systems online. Awaiting input.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`${styles.message} ${styles[msg.role]} ${idx === messages.length - 1 && isStreaming && msg.role === "assistant" ? styles.streaming : ""}`}
            style={{ animationDelay: `${Math.min(idx * 0.05, 0.3)}s` }}
          >
            {/* Message header */}
            <div className={styles.msgHeader}>
              <span className={styles.msgRole}>
                {msg.role === "user" ? "ZAC" : "JARVIS"}
              </span>
              <span className={styles.msgTime}>{formatTime(msg.timestamp)}</span>
            </div>

            {/* Message content */}
            <div className={styles.msgContent}>
              <MessageContent content={msg.content} role={msg.role} />
              {idx === messages.length - 1 &&
                isStreaming &&
                msg.role === "assistant" && (
                  <span className={styles.streamCursor}>▊</span>
                )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isStreaming && jarvisState === "thinking" && (
          <div className={`${styles.message} ${styles.assistant} ${styles.thinking}`}>
            <div className={styles.msgHeader}>
              <span className={styles.msgRole}>JARVIS</span>
            </div>
            <div className={styles.thinkingDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <div
          className={`${styles.inputWrapper} ${isStreaming ? styles.inputDisabled : ""}`}
        >
          <span className={styles.inputPrefix}>ZAC &gt;</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Issue a command..."
            className={styles.input}
            rows={1}
            disabled={isStreaming}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className={styles.sendBtn}
            title="Send (Enter)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 8L14 8M14 8L8 2M14 8L8 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.inputHint}>
          ENTER to send · SHIFT+ENTER for new line · Voice input in Phase 2
        </div>
      </div>
    </div>
  );
}

function MessageContent({
  content,
  role,
}: {
  content: string;
  role: string;
}) {
  if (!content) return null;

  // Split on double newlines for paragraphs, single newlines preserved
  const lines = content.split("\n");

  return (
    <div className={styles.contentInner}>
      {lines.map((line, i) => {
        // Detect markdown-ish patterns
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className={styles.contentH2}>
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={i} className={styles.contentH1}>
              {line.slice(2)}
            </h2>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className={styles.contentBullet}>
              <span className={styles.bulletDot}>◆</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (line.match(/^\d+\. /)) {
          const [num, ...rest] = line.split(". ");
          return (
            <div key={i} className={styles.contentBullet}>
              <span className={styles.bulletNum}>{num}.</span>
              <span>{rest.join(". ")}</span>
            </div>
          );
        }
        if (line === "") {
          return <div key={i} className={styles.contentSpacer} />;
        }
        // Bold text inline: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className={styles.contentPara}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}
