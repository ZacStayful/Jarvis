"use client";

import { useEffect, useRef } from "react";
import { JarvisState } from "@/app/page";
import styles from "./JarvisEye.module.css";

interface JarvisEyeProps {
  state: JarvisState;
}

export default function JarvisEye({ state }: JarvisEyeProps) {
  const pupilRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pupil follows mouse when idle
  useEffect(() => {
    if (state !== "idle") return;

    const handleMouseMove = (e: MouseEvent) => {
      const pupil = pupilRef.current;
      const container = containerRef.current;
      if (!pupil || !container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const angle = Math.atan2(dy, dx);
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 24);

      const x = Math.cos(angle) * distance * 0.4;
      const y = Math.sin(angle) * distance * 0.4;

      pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [state]);

  // Reset pupil position when not idle
  useEffect(() => {
    if (state === "idle") return;
    const pupil = pupilRef.current;
    if (!pupil) return;
    pupil.style.transform = "translate(-50%, -50%)";
  }, [state]);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${styles[state]}`}
    >
      {/* Outer atmosphere rings */}
      <div className={styles.atmosphereOuter} />
      <div className={styles.atmosphereMid} />

      {/* Rotating arc rings (thinking state) */}
      <div className={styles.arcRing1} />
      <div className={styles.arcRing2} />

      {/* Main eye body */}
      <div className={styles.eyeBody}>
        {/* Iris layers */}
        <div className={styles.irisOuter} />
        <div className={styles.irisDetail} />
        <div className={styles.irisInner} />

        {/* Iris pattern lines */}
        <svg className={styles.irisPattern} viewBox="0 0 200 200">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * 360;
            const rads = (angle * Math.PI) / 180;
            const x1 = 100 + 50 * Math.cos(rads);
            const y1 = 100 + 50 * Math.sin(rads);
            const x2 = 100 + 80 * Math.cos(rads);
            const y2 = 100 + 80 * Math.sin(rads);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(93,129,86,0.4)"
                strokeWidth="0.5"
              />
            );
          })}
          {/* Concentric detail circles */}
          <circle
            cx="100"
            cy="100"
            r="55"
            fill="none"
            stroke="rgba(93,129,86,0.2)"
            strokeWidth="0.5"
          />
          <circle
            cx="100"
            cy="100"
            r="65"
            fill="none"
            stroke="rgba(93,129,86,0.15)"
            strokeWidth="0.5"
          />
          <circle
            cx="100"
            cy="100"
            r="75"
            fill="none"
            stroke="rgba(93,129,86,0.1)"
            strokeWidth="0.5"
          />
        </svg>

        {/* Pupil */}
        <div className={styles.pupilWrapper}>
          <div ref={pupilRef} className={styles.pupil}>
            <div className={styles.pupilCore} />
            <div className={styles.pupilHighlight} />
          </div>
        </div>

        {/* Specular highlights */}
        <div className={styles.highlight1} />
        <div className={styles.highlight2} />
      </div>

      {/* Data rings (outer decorative) */}
      <div className={styles.dataRing}>
        <svg viewBox="0 0 300 300" className={styles.dataRingSvg}>
          {/* Dashed arcs */}
          <circle
            cx="150"
            cy="150"
            r="140"
            fill="none"
            stroke="rgba(93,129,86,0.15)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle
            cx="150"
            cy="150"
            r="132"
            fill="none"
            stroke="rgba(93,129,86,0.08)"
            strokeWidth="0.5"
            strokeDasharray="2 12"
          />

          {/* Tick marks */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i / 36) * 360;
            const rads = (angle * Math.PI) / 180;
            const len = i % 6 === 0 ? 10 : 5;
            const r = 140;
            const x1 = 150 + r * Math.cos(rads);
            const y1 = 150 + r * Math.sin(rads);
            const x2 = 150 + (r - len) * Math.cos(rads);
            const y2 = 150 + (r - len) * Math.sin(rads);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={`rgba(93,129,86,${i % 6 === 0 ? 0.5 : 0.2})`}
                strokeWidth={i % 6 === 0 ? 1 : 0.5}
              />
            );
          })}
        </svg>
      </div>

      {/* State label */}
      <div className={styles.stateLabel}>
        {state === "idle" && "STANDBY"}
        {state === "thinking" && "PROCESSING"}
        {state === "speaking" && "RESPONDING"}
        {state === "listening" && "LISTENING"}
      </div>
    </div>
  );
}
