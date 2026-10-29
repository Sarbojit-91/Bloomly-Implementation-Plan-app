import "server-only";
import type { Repo } from "@/lib/backend/types";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementKey } from "@/lib/habits/achievements";
import { mapCompletion, mapHabit } from "@/lib/data";
import type { ISODate } from "@/lib/dates";

export interface NewAchievement {
  key: AchievementKey;
  title: string;
  description: string;
}

/**
 * Re-evaluate achievements from the user's stored records and save any newly
 * earned ones. Returns only the ones earned just now, for celebrating.
 * Failures here never block the action that triggered them.
 */
export async function awardAchievements(repo: Repo, today: ISODate): Promise<NewAchievement[]> {
  try {
    const [habitRows, completionRows, journalCount, earnedRows] = await Promise.all([
      repo.listHabits(),
      repo.listCompletions(),
      repo.countJournal(),
      repo.listAchievements(),
    ]);
    const active = habitRows.map(mapHabit).filter((h) => !h.archivedAt);
    const completions = completionRows.map(mapCompletion);
    const earned = new Set(earnedRows.map((r) => `${r.key}:${r.habit_id ?? ""}`));

    const fresh = evaluateAchievements(active, completions, journalCount, today).filter(
      (a) => !earned.has(`${a.key}:${a.habitId ?? ""}`),
    );
    if (fresh.length === 0) return [];
    await repo.addAchievements(fresh.map((a) => ({ key: a.key, habit_id: a.habitId })));

    // Celebrate each kind of achievement once, even if several habits earned it.
    const seen = new Set<AchievementKey>();
    return fresh
      .filter((a) => (seen.has(a.key) ? false : (seen.add(a.key), true)))
      .map((a) => ({ key: a.key, title: ACHIEVEMENTS[a.key].title, description: ACHIEVEMENTS[a.key].description }));
  } catch (err) {
    console.error("Achievement evaluation failed", err);
    return [];
  }
}
