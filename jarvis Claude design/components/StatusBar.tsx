"use client";

import { useEffect, useState } from "react";
import { JarvisState } from "@/app/page";
import styles from "./StatusBar.module.css";

interface StatusBarProps {
  jarvisState: JarvisState;
  messageCount: number;
}

export default function StatusBar({ jarvisState, messageCount }: StatusBarProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDate(
        now.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).toUpperCase()
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.item}>JARVIS v1.0</span>
        <span className={styles.sep}>|</span>
        <span className={styles.item}>SHEFFIELD, ENGLAND</span>
        <span className={styles.sep}>|</span>
        <span className={`${styles.item} ${styles.state}`}>
          {jarvisState.toUpperCase()}
        </span>
      </div>

      <div className={styles.center}>
        <span className={styles.item}>{messageCount} COMMANDS THIS SESSION</span>
      </div>

      <div className={styles.right}>
        <span className={styles.item}>PHASE 1 — FOUNDATION</span>
        <span className={styles.sep}>|</span>
        <span className={styles.item}>{date}</span>
        <span className={styles.sep}>|</span>
        <span className={`${styles.item} ${styles.clock}`}>{time}</span>
      </div>
    </div>
  );
}
