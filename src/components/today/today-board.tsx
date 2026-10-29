"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Flame, Minus, Plus, Target } from "lucide-react";
import type { Habit } from "@/lib/habits/catalog";
import { formatAmount } from "@/lib/habits/catalog";
import type { StreakUnit } from "@/lib/habits/streaks";
import { setCompletion } from "@/lib/actions/habits";
import { Bloom } from "@/components/brand/bloom";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { HabitIcon } from "@/components/habits/habit-icon";
import { colorHex } from "@/lib/habits/catalog";
import { cn } from "@/lib/cn";
import { PetalBurst } from "./petal-burst";
import { progressMessage } from "@/lib/encouragement";

export interface TodayItem {
  habit: Habit;
  value: number | null;
  done: boolean;
  /** Strict habits expect every scheduled day. */
  strict: boolean;
  /** Completions this week before today. */
  weekBefore: number;
  weekGoal: number;
  streak: number;
  streakUnit: StreakUnit;
  schedule: string;
}

type Patch = { habitId: string; value: number | null; done: boolean };

const isDue = (i: TodayItem) => i.strict || i.done || i.weekBefore < i.habit.weeklyGoal;

/** A sensible "+" increment for a measurable target. */
export function stepFor(target: number): number {
  if (target <= 3) return 0.25;
  if (target <= 12) return 1;
  if (target <= 100) return 5;
  const rough = target / 10;
  const mag = 10 ** Math.floor(Math.log10(rough));
  return Math.round(rough / mag) * mag;
}

export function TodayBoard({ items, today, seed }: { items: TodayItem[]; today: string; seed: string }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [burst, setBurst] = useState(0);
  const [optimistic, applyPatch] = useOptimistic(items, (state, patch: Patch) =>
    state.map((i) => (i.habit.id === patch.habitId ? { ...i, value: patch.value, done: patch.done } : i)),
  );

  const due = optimistic.filter(isDue);
  const doneCount = due.filter((i) => i.done).length;
  const message = progressMessage(doneCount, due.length);

  /** `keep` false removes today's record; for measurable habits `value` is the amount logged. */
  const update = (item: TodayItem, value: number | null, keep: boolean) => {
    const target = item.habit.targetValue;
    const nowDone = target != null ? keep && (value ?? 0) >= target : keep;
    const patch: Patch = { habitId: item.habit.id, value: keep ? value : null, done: nowDone };
    const next = optimistic.map((i) => (i.habit.id === patch.habitId ? { ...i, ...patch } : i)).filter(isDue);
    const completesDay = nowDone && !item.done && next.length > 0 && next.every((i) => i.done);

    startTransition(async () => {
      applyPatch(patch);
      const res = await setCompletion({ habitId: item.habit.id, date: today, value, done: keep });
      if (!res.ok) {
        toast.error("That didn't save", res.message);
        return;
      }
      if (completesDay) setBurst((b) => b + 1);
      for (const a of res.achievements ?? []) toast.celebrate(`Achievement unlocked: ${a.title}`, a.description);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <Card className="relative flex flex-col items-center overflow-hidden p-6 text-center lg:self-start">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-tint/80 to-transparent" aria-hidden />
        <div className="relative">
          <Bloom done={doneCount} due={due.length} size={200} />
          <PetalBurst trigger={burst} />
        </div>
        <p className="relative mt-2 font-display text-3xl font-semibold" aria-live="polite">
          {doneCount}
          <span className="text-muted"> / {due.length}</span>
        </p>
        <p className="relative text-sm text-muted">habits done today</p>
        <div className="relative mt-5 w-full rounded-2xl bg-surface-muted px-4 py-3">
          <p className="font-semibold text-ink">{message.title}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{message.body}</p>
        </div>
        <p className="relative mt-4 text-xs italic text-muted">“{seed}”</p>
      </Card>

      <section aria-labelledby="today-list">
        <h2 id="today-list" className="sr-only">
          Today&apos;s habits
        </h2>
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {optimistic.map((item, idx) => (
              <motion.li
                key={item.habit.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.03 } }}
              >
                <HabitRow item={item} onChange={update} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}

function HabitRow({
  item,
  onChange,
}: {
  item: TodayItem;
  onChange: (item: TodayItem, value: number | null, done: boolean) => void;
}) {
  const { habit, done } = item;
  const reduce = useReducedMotion();
  const hex = colorHex(habit.color);
  const measurable = habit.targetValue != null;
  const target = habit.targetValue ?? 0;
  const value = item.value ?? 0;
  const pct = measurable ? Math.min(100, (value / target) * 100) : done ? 100 : 0;
  const step = stepFor(target);
  const weekNow = item.weekBefore + (done ? 1 : 0);
  const restingForWeek = !isDue(item);

  const toggle = () => {
    if (measurable) onChange(item, done ? 0 : target, !done);
    else onChange(item, null, !done);
  };

  return (
    <Card
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden p-4 transition-shadow hover:shadow-lift sm:p-5",
        done && "border-transparent",
      )}
      style={done ? { background: `color-mix(in srgb, ${hex} 7%, var(--surface))` } : undefined}
    >
      <motion.button
        type="button"
        onClick={toggle}
        whileTap={reduce ? undefined : { scale: 0.88 }}
        aria-pressed={done}
        aria-label={done ? `Undo ${habit.name}` : `Mark ${habit.name} as done`}
        className="relative grid size-12 shrink-0 place-items-center rounded-full border-2 transition-colors"
        style={{
          borderColor: done ? hex : `color-mix(in srgb, ${hex} 45%, transparent)`,
          backgroundColor: done ? hex : "transparent",
        }}
      >
        <AnimatePresence initial={false}>
          {done && (
            <motion.span
              key="check"
              initial={reduce ? false : { scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
            >
              <Check className="size-6 text-white" strokeWidth={3} aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
        {done && !reduce && (
          <motion.span
            key="ring"
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 0 ${hex}` }}
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.7 }}
            transition={{ duration: 0.6 }}
            aria-hidden
          />
        )}
      </motion.button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <HabitIcon icon={habit.icon} color={habit.color} size="sm" className="hidden sm:grid" />
          <div className="min-w-0">
            <Link
              href={`/habits/${habit.id}`}
              className={cn(
                "block truncate font-semibold text-ink hover:text-primary",
                done && "text-ink-soft line-through decoration-2 decoration-[color:var(--tint-strong)]",
              )}
            >
              {habit.name}
            </Link>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
              <span>{item.schedule}</span>
              {!item.strict && (
                <span className="inline-flex items-center gap-1">
                  <Target className="size-3" aria-hidden />
                  {weekNow}/{item.weekGoal} this week
                </span>
              )}
              {item.streak > 0 && (
                <span className="inline-flex items-center gap-1 font-medium" style={{ color: "#e0703f" }}>
                  <Flame className="size-3" aria-hidden />
                  {item.streak} {item.streakUnit}
                  {item.streak === 1 ? "" : "s"}
                </span>
              )}
              {restingForWeek && <span className="font-medium text-success">Weekly goal met — bonus if you like!</span>}
            </p>
          </div>
        </div>

        {measurable && (
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-tint"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={target}
              aria-valuenow={value}
              aria-label={`${habit.name} progress`}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: hex }}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium tabular-nums text-ink-soft">
              {formatAmount(value, null)} / {formatAmount(target, habit.unit)}
            </span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(0, +(value - step).toFixed(2));
                  onChange(item, next, next > 0);
                }}
                disabled={value <= 0}
                className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-tint disabled:opacity-40"
                aria-label={`Remove ${formatAmount(step, habit.unit)}`}
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = +(value + step).toFixed(2);
                  onChange(item, next, true);
                }}
                className="grid size-8 place-items-center rounded-lg bg-tint text-primary hover:bg-tint-strong"
                aria-label={`Add ${formatAmount(step, habit.unit)}`}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
