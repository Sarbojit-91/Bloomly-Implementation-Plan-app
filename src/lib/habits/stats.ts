import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  maxDate,
  minDate,
  startOfMonth,
  startOfWeek,
  type ISODate,
} from "@/lib/dates";
import {
  buildDoneSet,
  effectiveStart,
  isDueToday,
  isScheduledOn,
  type CompletionCore,
  type HabitCore,
} from "./model";

export interface RateResult {
  /** Days completed in the period. */
  completed: number;
  /** Completions the schedule asked for in the period (may be fractional for flexible habits). */
  expected: number;
  /** completed / expected, capped at 1; null when nothing was expected yet. */
  rate: number | null;
}

/**
 * Completion rate of one habit over [from, to].
 *
 * Each eligible scheduled day "expects" weeklyGoal / scheduledDays completions:
 * exactly 1 for strict habits, a fraction for flexible ones. Today only counts
 * once it's done, so an unfinished day never drags the rate down. Days before
 * the habit existed are ignored.
 */
export function habitRate(
  habit: HabitCore,
  completions: CompletionCore[],
  from: ISODate,
  to: ISODate,
  today: ISODate,
  done: Set<ISODate> = buildDoneSet(habit, completions),
  start: ISODate = effectiveStart(habit, completions),
): RateResult {
  const scheduled = habit.scheduleDays.length;
  if (scheduled === 0) return { completed: 0, expected: 0, rate: null };
  const perDay = Math.min(habit.weeklyGoal, scheduled) / scheduled;
  const lo = maxDate(from, start);
  const hi = minDate(to, today);

  let completed = 0;
  let expected = 0;
  for (let d = lo; d <= hi; d = addDays(d, 1)) {
    const isDone = done.has(d);
    if (isDone) completed++;
    if (!isScheduledOn(habit, d)) continue;
    if (d === today && !isDone) continue;
    expected += perDay;
  }
  return { completed, expected, rate: expected > 0 ? Math.min(1, completed / expected) : null };
}

/** Combined rate across habits; each habit's contribution is capped at what it expected. */
export function overallRate(
  habits: HabitCore[],
  completions: CompletionCore[],
  from: ISODate,
  to: ISODate,
  today: ISODate,
): RateResult {
  let completed = 0;
  let expected = 0;
  let rawCompleted = 0;
  for (const h of habits) {
    const r = habitRate(h, completions, from, to, today);
    rawCompleted += r.completed;
    completed += Math.min(r.completed, r.expected);
    expected += r.expected;
  }
  return { completed: rawCompleted, expected, rate: expected > 0 ? Math.min(1, completed / expected) : null };
}

export type PeriodKind = "week" | "month";

export interface Period {
  from: ISODate;
  to: ISODate;
}

export function currentPeriod(kind: PeriodKind, today: ISODate): Period {
  return kind === "week"
    ? { from: startOfWeek(today), to: endOfWeek(today) }
    : { from: startOfMonth(today), to: endOfMonth(today) };
}

export function previousPeriod(kind: PeriodKind, today: ISODate): Period {
  if (kind === "week") {
    const from = addDays(startOfWeek(today), -7);
    return { from, to: addDays(from, 6) };
  }
  const from = addMonths(today, -1);
  return { from, to: endOfMonth(from) };
}

export interface PeriodComparison {
  current: RateResult;
  previous: RateResult;
  /** Change in percentage points; null if either period had nothing expected. */
  deltaPoints: number | null;
}

export function comparePeriods(
  habits: HabitCore[],
  completions: CompletionCore[],
  kind: PeriodKind,
  today: ISODate,
): PeriodComparison {
  const cur = currentPeriod(kind, today);
  const prev = previousPeriod(kind, today);
  const current = overallRate(habits, completions, cur.from, cur.to, today);
  const previous = overallRate(habits, completions, prev.from, prev.to, today);
  const deltaPoints =
    current.rate != null && previous.rate != null ? Math.round((current.rate - previous.rate) * 100) : null;
  return { current, previous, deltaPoints };
}

/** Today's checklist progress: habits done vs habits due. */
export function todayProgress(habits: HabitCore[], completions: CompletionCore[], today: ISODate) {
  let due = 0;
  let done = 0;
  for (const h of habits) {
    const doneSet = buildDoneSet(h, completions);
    if (!isDueToday(h, today, doneSet)) continue;
    due++;
    if (doneSet.has(today)) done++;
  }
  return { due, done };
}

export function totalCompletions(habit: HabitCore, completions: CompletionCore[]): number {
  return buildDoneSet(habit, completions).size;
}

/** Completed habit-days per date, for heatmaps and daily charts. */
export function completionsByDate(habits: HabitCore[], completions: CompletionCore[]): Map<ISODate, number> {
  const map = new Map<ISODate, number>();
  for (const h of habits) {
    for (const d of buildDoneSet(h, completions)) map.set(d, (map.get(d) ?? 0) + 1);
  }
  return map;
}

export interface TrendPoint {
  label: ISODate; // week start
  rate: number | null;
  completed: number;
}

/** Overall weekly completion rate for the last `weeks` weeks (oldest first). */
export function weeklyTrend(
  habits: HabitCore[],
  completions: CompletionCore[],
  today: ISODate,
  weeks = 12,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const thisWeek = startOfWeek(today);
  for (let i = weeks - 1; i >= 0; i--) {
    const from = addDays(thisWeek, -7 * i);
    const r = overallRate(habits, completions, from, addDays(from, 6), today);
    points.push({ label: from, rate: r.rate, completed: r.completed });
  }
  return points;
}

export interface HabitRanking {
  habitId: string;
  rate: number;
  completed: number;
  expected: number;
}

/**
 * Habits ranked by completion rate over a window. Habits with too little
 * history (less than `minExpected` expected completions) are left out, so a
 * single check-off doesn't read as "100% consistent".
 */
export function rankHabits(
  habits: HabitCore[],
  completions: CompletionCore[],
  from: ISODate,
  today: ISODate,
  minExpected = 3,
): HabitRanking[] {
  return habits
    .map((h) => {
      const r = habitRate(h, completions, from, today, today);
      return { habitId: h.id, rate: r.rate ?? 0, completed: r.completed, expected: r.expected };
    })
    .filter((r) => r.expected >= minExpected)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed);
}

/** Dates on which every habit due that day was completed (at least one due). */
export function perfectDays(habits: HabitCore[], completions: CompletionCore[], from: ISODate, today: ISODate): ISODate[] {
  const sets = habits.map((h) => ({ h, done: buildDoneSet(h, completions), start: effectiveStart(h, completions) }));
  const out: ISODate[] = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    let due = 0;
    let ok = true;
    for (const { h, done, start } of sets) {
      if (d < start || !isDueToday(h, d, done)) continue;
      due++;
      if (!done.has(d)) {
        ok = false;
        break;
      }
    }
    if (due > 0 && ok) out.push(d);
  }
  return out;
}
