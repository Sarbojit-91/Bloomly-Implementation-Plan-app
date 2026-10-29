"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The Bloomly flower: each petal stands for one habit due today and fills in
 * as it's completed. With fewer than 5 or more than 12 habits, petals fill
 * proportionally instead so the flower always looks balanced.
 */
export function Bloom({
  done,
  due,
  size = 220,
  className,
}: {
  done: number;
  due: number;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const perHabit = due >= 5 && due <= 12;
  const petals = perHabit ? due : 8;
  const filled = due === 0 ? 0 : perHabit ? done : (done / due) * petals;
  const complete = due > 0 && done >= due;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg
        viewBox="-100 -100 200 200"
        width={size}
        height={size}
        role="img"
        aria-label={due === 0 ? "No habits due today" : `${done} of ${due} habits done today`}
      >
        <defs>
          <linearGradient id="petal-fill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
          <radialGradient id="bloom-core" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="#fff7d6" />
            <stop offset="100%" stopColor="#f5c86b" />
          </radialGradient>
        </defs>

        <motion.g
          animate={complete && !reduce ? { rotate: [0, 6, 0] } : { rotate: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {Array.from({ length: petals }, (_, i) => {
            const angle = (360 / petals) * i;
            const amount = Math.max(0, Math.min(1, filled - i));
            return (
              <g key={i} transform={`rotate(${angle})`}>
                <path d={PETAL} fill="var(--tint)" stroke="var(--tint-strong)" strokeWidth="1.5" />
                <motion.path
                  d={PETAL}
                  fill="url(#petal-fill)"
                  initial={false}
                  animate={{ opacity: amount > 0 ? 0.35 + 0.65 * amount : 0, scale: amount > 0 ? 0.7 + 0.3 * amount : 0.6 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 16, delay: i * 0.04 }}
                  style={{ transformOrigin: "0px 0px" }}
                />
              </g>
            );
          })}
        </motion.g>
        <circle r="24" fill="url(#bloom-core)" stroke="#fff" strokeWidth="3" />
      </svg>
    </div>
  );
}

const PETAL = "M0 -22 C 22 -40, 26 -78, 0 -94 C -26 -78, -22 -40, 0 -22 Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} rx="15" ry="26" cy="-22" transform={`rotate(${a})`} fill="var(--accent)" opacity="0.9" />
      ))}
      <circle r="12" fill="var(--primary)" />
      <circle r="5" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-8" />
      <span className="font-display text-xl font-semibold tracking-tight text-ink">Bloomly</span>
    </span>
  );
}
