"use client";

import { C } from "@/lib/jarvis-design";
import { DIRECTORS, splitBySpeaker } from "@/lib/ads/speakers";

interface BubbleMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function Bubble({ msg }: { msg: BubbleMessage }) {
  const isUser = msg.role === "user";
  // Assistant replies may carry [JARVIS]/[JANET] tags from the marketing
  // department; each part gets its director's label. An untagged reply is a
  // single JARVIS part, so it renders exactly as before.
  const parts = isUser ? [] : splitBySpeaker(msg.content);
  const sections = isUser
    ? [{ label: null, colour: C.primary, text: msg.content }]
    : (parts.length > 0 ? parts : [{ speaker: "jarvis" as const, text: "" }]).map((p) => ({
        label: DIRECTORS[p.speaker].label,
        colour: DIRECTORS[p.speaker].colour,
        text: p.text,
      }));

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
        {sections.map((section, i) => (
          <div key={i} style={{ marginTop: i > 0 ? 10 : 0 }}>
            {section.label && (
              <div
                className="orb"
                style={{ fontSize: 8, color: section.colour, letterSpacing: "0.18em", marginBottom: 5 }}
              >
                {section.label}
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
              {section.text}
              {msg.isStreaming && i === sections.length - 1 && (
                <span style={{ color: C.bright, marginLeft: 2 }}>▊</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
