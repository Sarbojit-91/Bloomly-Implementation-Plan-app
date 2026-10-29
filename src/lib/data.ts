import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuth, repoFor } from "@/lib/backend";
import type { Repo, Row, SessionUser } from "@/lib/backend/types";
import { safeTimeZone, todayInTimeZone, type ISODate } from "@/lib/dates";
import type { Completion, Habit, JournalEntry, Profile } from "@/lib/habits/catalog";
import type { AchievementKey } from "@/lib/habits/achievements";

/**
 * Data access layer. Every read goes through the signed-in user's session,
 * and the database's row-level security decides what comes back.
 */

export type { SessionUser };

export const getUser = cache(async (): Promise<SessionUser | null> => {
  // Always per-request: never let a signed-in page be prerendered at build time.
  await connection();
  return (await getAuth()).getSessionUser();
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** The signed-in user's repository (redirects to sign-in if there's no session). */
export const getRepo = cache(async (): Promise<Repo> => repoFor((await requireUser()).id));

const toNumber = (v: unknown): number | null => (v == null ? null : Number(v));

export function mapHabit(r: Row): Habit {
  return {
    id: String(r.id),
    name: String(r.name),
    description: (r.description as string | null) ?? null,
    icon: String(r.icon),
    color: String(r.color),
    category: r.category as Habit["category"],
    scheduleDays: ((r.schedule_days as number[]) ?? []).map(Number),
    weeklyGoal: Number(r.weekly_goal),
    targetValue: toNumber(r.target_value),
    unit: (r.unit as string | null) || null,
    reminderTime: r.reminder_time ? String(r.reminder_time).slice(0, 5) : null,
    createdOn: String(r.created_on).slice(0, 10),
    archivedAt: (r.archived_at as string | null) ?? null,
    sortOrder: Number(r.sort_order ?? 0),
  };
}

export function mapCompletion(r: Row): Completion {
  return {
    id: String(r.id),
    habitId: String(r.habit_id),
    date: String(r.completed_on).slice(0, 10),
    value: toNumber(r.value),
  };
}

function mapJournal(r: Row): JournalEntry {
  return {
    id: String(r.id),
    date: String(r.entry_date).slice(0, 10),
    mood: toNumber(r.mood),
    reflection: String(r.reflection ?? ""),
    notes: String(r.notes ?? ""),
    updatedAt: String(r.updated_at),
  };
}

export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const data = await (await getRepo()).getProfile();
  return {
    id: user.id,
    email: user.email,
    displayName: String(data?.display_name ?? ""),
    timezone: safeTimeZone(data?.timezone as string | undefined),
    theme: (data?.theme as Profile["theme"]) ?? "light",
    remindersEnabled: Boolean(data?.reminders_enabled),
  };
});

/** The current calendar date in the user's timezone. */
export async function getToday(): Promise<ISODate> {
  const profile = await getProfile();
  return todayInTimeZone(profile.timezone);
}

export const listHabits = cache(async (): Promise<Habit[]> => (await (await getRepo()).listHabits()).map(mapHabit));

export async function listActiveHabits(): Promise<Habit[]> {
  return (await listHabits()).filter((h) => !h.archivedAt);
}

export async function getHabit(id: string): Promise<Habit | null> {
  return (await listHabits()).find((h) => h.id === id) ?? null;
}

export const listCompletions = cache(
  async (): Promise<Completion[]> => (await (await getRepo()).listCompletions()).map(mapCompletion),
);

export const listJournalEntries = cache(
  async (): Promise<JournalEntry[]> => (await (await getRepo()).listJournal()).map(mapJournal),
);

export interface EarnedAchievementRow {
  key: AchievementKey;
  habitId: string | null;
  earnedAt: string;
}

export const listAchievements = cache(async (): Promise<EarnedAchievementRow[]> =>
  (await (await getRepo()).listAchievements()).map((r) => ({
    key: r.key as AchievementKey,
    habitId: (r.habit_id as string | null) ?? null,
    earnedAt: String(r.earned_at),
  })),
);
