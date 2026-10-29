import { addDays, startOfWeek, type ISODate } from "@/lib/dates";
import { buildDoneSet, effectiveStart, weekCount, weekGoal, type CompletionCore, type HabitCore } from "./model";
import { computeStreak } from "./streaks";
import { perfectDays } from "./stats";

export type AchievementKey =
  | "first_bloom"
  | "streak_7"
  | "streak_30"
  | "completions_30"
  | "completions_100"
  | "weekly_goal"
  | "personal_best"
  | "perfect_day"
  | "first_reflection"
  | "reflections_7";

export interface AchievementDef {
  key: AchievementKey;
  title: string;
  description: string;
  /** Lucide icon name rendered by the badge component. */
  icon: string;
  scope: "habit" | "user";
}

export const ACHIEVEMENTS: Record<AchievementKey, AchievementDef> = {
  first_bloom: {
    key: "first_bloom",
    title: "First bloom",
    description: "Completed a habit for the very first time.",
    icon: "Sprout",
    scope: "user",
  },
  streak_7: {
    key: "streak_7",
    title: "Seven in a row",
    description: "Reached a streak of 7 on a habit.",
    icon: "Flame",
    scope: "habit",
  },
  streak_30: {
    key: "streak_30",
    title: "Deep roots",
    description: "Reached a streak of 30 on a habit.",
    icon: "TreeDeciduous",
    scope: "habit",
  },
  completions_30: {
    key: "completions_30",
    title: "Thirty blooms",
    description: "Completed a habit 30 times.",
    icon: "Flower2",
    scope: "habit",
  },
  completions_100: {
    key: "completions_100",
    title: "Full garden",
    description: "Completed a habit 100 times.",
    icon: "Trophy",
    scope: "habit",
  },
  weekly_goal: {
    key: "weekly_goal",
    title: "Goal getter",
    description: "Met a habit's weekly goal for the first time.",
    icon: "Target",
    scope: "user",
  },
  personal_best: {
    key: "personal_best",
    title: "Personal best",
    description: "Matched or beat your longest streak (3+) on a habit.",
    icon: "Medal",
    scope: "habit",
  },
  perfect_day: {
    key: "perfect_day",
    title: "Perfect day",
    description: "Completed every habit planned for a day.",
    icon: "Sun",
    scope: "user",
  },
  first_reflection: {
    key: "first_reflection",
    title: "Dear diary",
    description: "Wrote your first journal reflection.",
    icon: "NotebookPen",
    scope: "user",
  },
  reflections_7: {
    key: "reflections_7",
    title: "Reflective week",
    description: "Wrote 7 journal reflections.",
    icon: "BookHeart",
    scope: "user",
  },
};

export interface EarnedAchievement {
  key: AchievementKey;
  habitId: string | null;
}

/**
 * Every achievement the user's current records qualify for. The server stores
 * these idempotently, so once earned an achievement stays earned even if a
 * completion is later undone.
 */
export function evaluateAchievements(
  habits: HabitCore[],
  completions: CompletionCore[],
  journalEntryCount: number,
  today: ISODate,
): EarnedAchievement[] {
  const out: EarnedAchievement[] = [];
  let anyCompletion = false;
  let anyWeeklyGoal = false;

  for (const h of habits) {
    const done = buildDoneSet(h, completions);
    if (done.size === 0) continue;
    anyCompletion = true;

    const streak = computeStreak(h, completions, today);
    const best = Math.max(streak.longest, streak.current);
    if (best >= 7) out.push({ key: "streak_7", habitId: h.id });
    if (best >= 30) out.push({ key: "streak_30", habitId: h.id });
    if (done.size >= 30) out.push({ key: "completions_30", habitId: h.id });
    if (done.size >= 100) out.push({ key: "completions_100", habitId: h.id });
    if (streak.isPersonalBest && streak.current >= 3) out.push({ key: "personal_best", habitId: h.id });

    if (!anyWeeklyGoal) {
      const start = effectiveStart(h, completions);
      for (let w = startOfWeek(start); w <= today; w = addDays(w, 7)) {
        const goal = weekGoal(h, w, start);
        if (goal > 0 && goal === h.weeklyGoal && weekCount(h, done, w, today) >= goal) {
          anyWeeklyGoal = true;
          break;
        }
      }
    }
  }

  if (anyCompletion) out.unshift({ key: "first_bloom", habitId: null });
  if (anyWeeklyGoal) out.push({ key: "weekly_goal", habitId: null });

  if (anyCompletion) {
    const earliest = completions.reduce((min, c) => (c.date < min ? c.date : min), today);
    if (perfectDays(habits, completions, earliest, today).length > 0) out.push({ key: "perfect_day", habitId: null });
  }

  if (journalEntryCount >= 1) out.push({ key: "first_reflection", habitId: null });
  if (journalEntryCount >= 7) out.push({ key: "reflections_7", habitId: null });

  return out;
}
