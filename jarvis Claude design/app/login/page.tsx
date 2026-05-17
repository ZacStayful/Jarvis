"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "denied">("idle");
  const [displayText, setDisplayText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const bootLines = [
    "JARVIS COMMAND CENTRE v1.0",
    "STAYFUL INTELLIGENCE SYSTEMS",
    "Initialising secure environment...",
    "Neural interface: ONLINE",
    "Knowledge base: STANDBY",
    "Awaiting authorisation...",
  ];

  useEffect(() => {
    let lineIndex = 0;
    let charIndex = 0;
    let current = "";

    const typeNext = () => {
      if (lineIndex >= bootLines.length) {
        setTimeout(() => setShowInput(true), 400);
        return;
      }

      const line = bootLines[lineIndex];

      if (charIndex < line.length) {
        current += line[charIndex];
        setDisplayText(
          bootLines.slice(0, lineIndex).join("\n") + "\n" + current
        );
        charIndex++;
        setTimeout(typeNext, charIndex === 1 ? 80 : 28);
      } else {
        lineIndex++;
        charIndex = 0;
        current = "";
        setTimeout(typeNext, 180);
      }
    };

    const timer = setTimeout(typeNext, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || status === "checking") return;

    setStatus("checking");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setDisplayText((prev) => prev + "\n\nIdentity confirmed. Welcome, Zac.");
        setTimeout(() => router.push("/"), 800);
      } else {
        setStatus("denied");
        setPassword("");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch {
      setStatus("denied");
      setPassword("");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <div className={styles.container}>
      {/* Corner decorations */}
      <div className={styles.cornerTL} />
      <div className={styles.cornerTR} />
      <div className={styles.cornerBL} />
      <div className={styles.cornerBR} />

      {/* Scan line */}
      <div className={styles.scanLine} />

      {/* Central panel */}
      <div className={styles.panel}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.eyeSmall}>
            <div className={styles.eyeRing1} />
            <div className={styles.eyeRing2} />
            <div className={styles.eyeCore} />
            <div className={styles.eyePupil} />
          </div>
        </div>

        {/* Terminal output */}
        <div className={styles.terminal}>
          <pre className={styles.terminalText}>
            {displayText}
            <span className={styles.cursor}>▊</span>
          </pre>
        </div>

        {/* Auth form */}
        {showInput && (
          <form
            onSubmit={handleSubmit}
            className={`${styles.authForm} ${showInput ? styles.authFormVisible : ""}`}
          >
            <div
              className={`${styles.inputWrapper} ${status === "denied" ? styles.inputDenied : ""}`}
            >
              <span className={styles.inputPrefix}>ACCESS CODE &gt;</span>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.passwordInput}
                placeholder="——————————"
                autoComplete="off"
                disabled={status === "checking"}
              />
            </div>

            {status === "denied" && (
              <div className={styles.deniedMsg}>
                ⚠ ACCESS DENIED — INVALID CREDENTIALS
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!password || status === "checking"}
            >
              {status === "checking" ? "VERIFYING..." : "AUTHENTICATE"}
            </button>
          </form>
        )}
      </div>

      {/* Bottom status bar */}
      <div className={styles.statusBar}>
        <span>JARVIS v1.0</span>
        <span>STAYFUL INTELLIGENCE</span>
        <span>SECURE CHANNEL</span>
      </div>
    </div>
  );
}
