"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const PETALS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 90 + (i % 3) * 22;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist - 20,
    rotate: (i * 47) % 360,
    color: ["#8b5cf6", "#d9ccff", "#e2558c", "#f5c86b"][i % 4],
    delay: (i % 5) * 0.02,
  };
});

/** A gentle burst of petals. Re-plays whenever `trigger` changes (and is > 0). */
export function PetalBurst({ trigger }: { trigger: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      <AnimatePresence>
        {trigger > 0 &&
          PETALS.map((p, i) => (
            <motion.span
              key={`${trigger}-${i}`}
              className="absolute block h-4 w-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
              animate={{ x: p.x, y: p.y + 60, opacity: 0, scale: 1, rotate: p.rotate + 180 }}
              transition={{ duration: 1.3, ease: [0.2, 0.7, 0.3, 1], delay: p.delay }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
