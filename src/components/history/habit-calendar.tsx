"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Undo2 } from "lucide-react";
import {
  addDays,
  dayOfWeek,
  endOfMonth,
  formatLong,
  formatMonth,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type ISODate,
} from "@/lib/dates";
import { buildDoneSet, buildValueMap, dayStatus, type DayStatus } from "@/lib/habits/model";
import { colorHex, formatAmount, type Habit } from "@/lib/habits/catalog";
import { setCompletion } from "@/lib/actions/habits";
import { stepFor } from "@/components/today/today-board";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STATUS_TEXT: Record<DayStatus, string> = {
  done: "Completed",
  partial: "Some progress",
  pending: "Not done yet today",
  missed: "Not logged",
  open: "Not logged (flexible day)",
  unscheduled: "Not scheduled",
  future: "Coming up",
  inactive: "Before this habit started",
};

export function HabitCalendar({
  habit,
  month,
  today,
  start,
  values,
  prevHref,
  nextHref,
}: {
  habit: Habit;
  month: ISODate; // first of month
  today: ISODate;
  start: ISODate;
  values: Record<ISODate, number | null>;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const toast = useToast();
  const hex = colorHex(habit.color);
  const [, startTransition] = useTransition();
  const [optimistic, patch] = useOptimistic(values, (state, p: { date: ISODate; value: number | null | undefined }) => {
    const next = { ...state };
    if (p.value === undefined) delete next[p.date];
    else next[p.date] = p.value;
    return next;
  });
  const defaultSelected = today.slice(0, 7) === month.slice(0, 7) ? today : endOfMonth(month) < today ? endOfMonth(month) : month;
  const [selected, setSelected] = useState<ISODate>(defaultSelected);

  const completions = Object.entries(optimistic).map(([date, value]) => ({ habitId: habit.id, date, value }));
  const done = buildDoneSet(habit, completions);
  const valueMap = buildValueMap(habit, completions);
  const statusOf = (d: ISODate) => dayStatus(habit, d, today, done, valueMap, start);

  // Calendar grid, Monday first.
  const lead = (dayOfWeek(month) + 6) % 7;
  const last = endOfMonth(month);
  const cells: (ISODate | null)[] = Array(lead).fill(null);
  for (let d = month; d <= last; d = addDays(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const measurable = habit.targetValue != null;
  const selStatus = statusOf(selected);
  const selValue = optimistic[selected];
  const editable =
    !habit.archivedAt &&
    selected <= today &&
    selected >= addDays(today, -366) &&
    !["unscheduled", "future"].includes(selStatus);

  const save = (date: ISODate, value: number | null, keep: boolean) => {
    startTransition(async () => {
      patch({ date, value: keep ? value : undefined });
      const res = await setCompletion({ habitId: habit.id, date, value, done: keep });
      if (!res.ok) toast.error("That didn't save", res.message);
      else {
        if (keep && !measurable) toast.success(`Logged for ${formatLong(date)}`);
        for (const a of res.achievements ?? []) toast.celebrate(`Achievement unlocked: ${a.title}`, a.description);
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:gap-8">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{formatMonth(month)}</h3>
          <div className="flex gap-1">
            {prevHref ? (
              <Link href={prevHref} scroll={false} className="grid size-9 place-items-center rounded-xl hover:bg-tint" aria-label="Previous month">
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span className="grid size-9 place-items-center rounded-xl opacity-30" aria-hidden>
                <ChevronLeft className="size-4" />
              </span>
            )}
            {nextHref ? (
              <Link href={nextHref} scroll={false} className="grid size-9 place-items-center rounded-xl hover:bg-tint" aria-label="Next month">
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="grid size-9 place-items-center rounded-xl opacity-30" aria-hidden>
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`${habit.name}, ${formatMonth(month)}`}>
          {WEEKDAY_ORDER.map((d) => (
            <div key={d} role="columnheader" className="pb-1 text-xs font-medium text-muted">
              {WEEKDAY_LABELS[d]}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} role="gridcell" />;
            const s = statusOf(d);
            const isSel = d === selected;
            return (
              <button
                key={d}
                type="button"
                role="gridcell"
                aria-selected={isSel}
                aria-label={`${formatLong(d)}: ${STATUS_TEXT[s]}`}
                onClick={() => setSelected(d)}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-xl text-sm font-medium transition",
                  s === "done" && "text-white",
                  s === "partial" && "text-ink",
                  s === "missed" && "border border-dashed border-line-strong text-ink-soft",
                  (s === "open" || s === "pending") && "border border-line-strong text-ink-soft",
                  (s === "unscheduled" || s === "inactive") && "text-muted/60",
                  s === "future" && "border border-line text-muted",
                  isSel && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                  "hover:scale-105",
                )}
                style={
                  s === "done"
                    ? { backgroundColor: hex }
                    : s === "partial"
                      ? { backgroundColor: `color-mix(in srgb, ${hex} 25%, transparent)` }
                      : undefined
                }
              >
                {Number(d.slice(8))}
                {d === today && <span className="absolute bottom-1 size-1 rounded-full bg-current" aria-hidden />}
              </button>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded" style={{ backgroundColor: hex }} /> Completed
          </li>
          {measurable && (
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded" style={{ backgroundColor: `color-mix(in srgb, ${hex} 25%, transparent)` }} /> Partial
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-dashed border-line-strong" /> Not logged
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded text-center text-[9px] leading-3">7</span> Not scheduled
          </li>
        </ul>
      </div>

      <div className="rounded-2xl bg-surface-muted p-4" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Selected day</p>
        <p className="mt-1 font-semibold">{formatLong(selected)}</p>
        <p className="mt-1 text-sm text-ink-soft">{STATUS_TEXT[selStatus]}</p>
        {measurable && selValue != null && (
          <p className="mt-1 text-sm text-ink-soft">
            Logged {formatAmount(selValue ?? 0, habit.unit)} of {formatAmount(habit.targetValue!, habit.unit)}
          </p>
        )}

        {editable && (
          <div className="mt-4 flex flex-col gap-2">
            {measurable ? (
              <MeasurableEditor
                value={selValue ?? 0}
                target={habit.targetValue!}
                unit={habit.unit}
                onSave={(v) => save(selected, v, v > 0)}
              />
            ) : selStatus === "done" ? (
              <Button variant="secondary" size="sm" onClick={() => save(selected, null, false)}>
                <Undo2 className="size-4" aria-hidden /> Undo completion
              </Button>
            ) : (
              <Button size="sm" onClick={() => save(selected, null, true)}>
                <Check className="size-4" aria-hidden /> Mark as done
              </Button>
            )}
          </div>
        )}
        {selStatus === "unscheduled" && (
          <p className="mt-3 text-xs text-muted">This habit takes a break on {WEEKDAY_LABELS[dayOfWeek(selected)]}s, so there&apos;s nothing to log.</p>
        )}
      </div>
    </div>
  );
}

function MeasurableEditor({
  value,
  target,
  unit,
  onSave,
}: {
  value: number;
  target: number;
  unit: string | null;
  onSave: (v: number) => void;
}) {
  const step = stepFor(target);
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(Math.max(0, +(value - step).toFixed(2)))}
          disabled={value <= 0}
          className="grid size-9 place-items-center rounded-xl border border-line-strong hover:bg-tint disabled:opacity-40"
          aria-label={`Remove ${formatAmount(step, unit)}`}
        >
          <Minus className="size-4" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold tabular-nums">{formatAmount(value, unit)}</span>
        <button
          type="button"
          onClick={() => onSave(+(value + step).toFixed(2))}
          className="grid size-9 place-items-center rounded-xl bg-tint text-primary hover:bg-tint-strong"
          aria-label={`Add ${formatAmount(step, unit)}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
      {value < target ? (
        <Button size="sm" onClick={() => onSave(target)}>
          <Check className="size-4" aria-hidden /> Log full target
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => onSave(0)}>
          <Undo2 className="size-4" aria-hidden /> Clear this day
        </Button>
      )}
    </>
  );
}
