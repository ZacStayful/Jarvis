"use client";

import { C } from "@/lib/jarvis-design";

interface BubbleMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function Bubble({ msg }: { msg: BubbleMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        animation: "fadeUp .3s ease forwards",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: "82%",
          padding: isUser ? "7px 12px" : "9px 14px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
          background: isUser ? `${C.primary}25` : `${C.surface}`,
          border: `1px solid ${isUser ? C.primary + "44" : C.border}`,
          color: C.text,
        }}
      >
        {!isUser && (
          <div
            className="orb"
            style={{ fontSize: 8, color: C.primary, letterSpacing: "0.18em", marginBottom: 5 }}
          >
            JARVIS
          </div>
        )}
        <p
          className="raj"
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            fontWeight: isUser ? 400 : 300,
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.content}
          {msg.isStreaming && (
            <span style={{ color: C.bright, marginLeft: 2 }}>▊</span>
          )}
        </p>
      </div>
    </div>
  );
}
