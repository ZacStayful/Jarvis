import { S } from "./styles";
import type { ChunkId } from "./types";

const VOICE_CMDS: Record<ChunkId, string> = {
  pipeline: '"focus on pipeline"',
  outreach: '"focus on outreach"',
  meetings: '"focus on meetings"',
  offers: '"show me offers"',
};

export type ChunkStatus = "live" | "loading" | "error";

export function Chunk({
  id,
  index,
  name,
  focused,
  onClick,
  status,
  delayMs = 0,
  children,
}: {
  id: ChunkId;
  index: string;
  name: string;
  focused: boolean;
  onClick: () => void;
  status: ChunkStatus;
  delayMs?: number;
  children: React.ReactNode;
}) {
  const dotColor =
    status === "loading" ? S.amber : status === "error" ? S.red : S.green;
  return (
    <div
      onClick={onClick}
      style={{
        borderBottom: `1px solid ${S.border}`,
        padding: "24px 28px",
        cursor: "default",
        position: "relative",
        background: focused ? "rgba(93,129,86,0.04)" : "transparent",
        borderLeft: focused
          ? `2px solid ${S.green}`
          : "2px solid transparent",
        animation: "fadeUp 0.4s ease both",
        animationDelay: `${delayMs}ms`,
      }}
    >
      {focused && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, rgba(93,129,86,0.3), transparent)`,
            animation: "scanline 3s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="mono"
            style={{
              fontSize: 9,
              color: S.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            {index} /
          </span>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: S.textDim,
              textTransform: "uppercase",
            }}
          >
            {name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 8,
              color: S.greenDim,
              letterSpacing: "0.06em",
              background: S.greenPale,
              border: `1px solid ${S.border}`,
              borderRadius: 4,
              padding: "2px 7px",
              opacity: focused ? 1 : 0,
              transition: "opacity 0.2s",
            }}
          >
            {VOICE_CMDS[id]}
          </span>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: dotColor,
              animation:
                status === "loading"
                  ? "pulse 1.5s ease infinite"
                  : "none",
            }}
          />
        </div>
      </div>
      {focused && (
        <div
          className="mono"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "rgba(93,129,86,0.06)",
            border: `1px solid ${S.borderHi}`,
            borderRadius: 6,
            fontSize: 9,
            color: S.greenHi,
            letterSpacing: "0.06em",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: S.green,
              animation: "pulse 2s ease infinite",
            }}
          />
          JARVIS focused — say &quot;summarise&quot; for AI briefing
        </div>
      )}
      {children}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 9,
        color: S.textMuted,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        padding: "7px 28px",
        background: S.surface,
        borderBottom: `1px solid ${S.border}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {label}
      <div style={{ flex: 1, height: 1, background: S.border }} />
    </div>
  );
}

export function LoadingSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 80,
            borderRadius: 8,
            background: S.surface,
            border: `1px solid ${S.border}`,
            animation: "pulse 1.5s ease infinite",
          }}
        />
      ))}
    </div>
  );
}

export function ChunkErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        padding: "20px",
        textAlign: "center",
        background: S.surface,
        border: `1px solid ${S.border}`,
        borderRadius: 8,
      }}
    >
      <div className="mono" style={{ color: S.red, fontSize: 11, marginBottom: 10 }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        className="mono"
        style={{
          background: S.surface2,
          border: `1px solid ${S.border}`,
          color: S.greenHi,
          padding: "5px 14px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 10,
          letterSpacing: "0.1em",
        }}
      >
        RETRY
      </button>
    </div>
  );
}
