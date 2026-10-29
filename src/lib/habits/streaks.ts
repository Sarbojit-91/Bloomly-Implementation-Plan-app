import { addDays, startOfWeek, type ISODate } from "@/lib/dates";
import {
  buildDoneSet,
  effectiveStart,
  isScheduledOn,
  isStrict,
  weekCount,
  weekGoal,
  type CompletionCore,
  type HabitCore,
} from "./model";

export type StreakUnit = "day" | "week";

export interface StreakInfo {
  current: number;
  longest: number;
  unit: StreakUnit;
  /** True when the current streak equals the longest one and is above zero. */
  isPersonalBest: boolean;
}

/**
 * Schedule-aware streaks.
 *
 * Strict habits count consecutive *scheduled* days that were completed; days
 * the habit isn't planned for are skipped, never treated as breaks. Flexible
 * habits ("3× a week") count consecutive weeks in which the weekly goal was met.
 *
 * The current day (or current week) never breaks a streak while it is still in
 * progress: it only adds to the streak once it's complete.
 */
export function computeStreak(habit: HabitCore, completions: CompletionCore[], today: ISODate): StreakInfo {
  const done = buildDoneSet(habit, completions);
  const start = effectiveStart(habit, completions);
  const result = isStrict(habit) ? dayStreak(habit, done, start, today) : weekStreak(habit, done, start, today);
  return { ...result, isPersonalBest: result.current > 0 && result.current >= result.longest };
}

function dayStreak(habit: HabitCore, done: Set<ISODate>, start: ISODate, today: ISODate) {
  if (habit.scheduleDays.length === 0) return { current: 0, longest: 0, unit: "day" as const };

  // Current: walk back from today over scheduled days.
  let current = 0;
  for (let d = today; d >= start; d = addDays(d, -1)) {
    if (!isScheduledOn(habit, d)) continue;
    if (done.has(d)) current++;
    else if (d === today) continue; // today is still in progress
    else break;
  }

  // Longest: walk forward through history.
  let longest = 0;
  let run = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d)) continue;
    if (done.has(d)) {
      run++;
      if (run > longest) longest = run;
    } else if (d !== today) {
      run = 0;
    }
  }

  return { current, longest: Math.max(longest, current), unit: "day" as const };
}

function weekStreak(habit: HabitCore, done: Set<ISODate>, start: ISODate, today: ISODate) {
  const thisWeek = startOfWeek(today);
  const firstWeek = startOfWeek(start);
  const met = (week: ISODate) => {
    const goal = weekGoal(habit, week, start);
    return goal > 0 && weekCount(habit, done, week, today) >= goal;
  };

  let current = 0;
  for (let w = thisWeek; w >= firstWeek; w = addDays(w, -7)) {
    if (met(w)) current++;
    else if (w === thisWeek) continue; // this week is still in progress
    else break;
  }

  let longest = 0;
  let run = 0;
  for (let w = firstWeek; w <= thisWeek; w = addDays(w, 7)) {
    if (met(w)) {
      run++;
      if (run > longest) longest = run;
    } else if (w !== thisWeek) {
      run = 0;
    }
  }

  return { current, longest: Math.max(longest, current), unit: "week" as const };
}

export function formatStreak(n: number, unit: StreakUnit): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}
