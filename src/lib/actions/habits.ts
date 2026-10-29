"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getRepo, getToday, mapHabit } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { isScheduledOn, meetsTarget } from "@/lib/habits/model";
import { fieldErrors, habitSchema, isoDateSchema, type HabitInput } from "@/lib/validation";
import { awardAchievements, type NewAchievement } from "@/lib/achievements-server";
import type { HabitWrite } from "@/lib/backend/types";

export interface HabitFormState {
  message?: string;
  errors?: Record<string, string>;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
  achievements?: NewAchievement[];
}

const uuid = z.uuid();

function parseHabitForm(formData: FormData) {
  return habitSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    icon: formData.get("icon") ?? "",
    color: formData.get("color") ?? "",
    category: formData.get("category") ?? "",
    scheduleDays: formData.getAll("scheduleDays"),
    weeklyGoal: formData.get("weeklyGoal") ?? "",
    targetValue: formData.get("hasTarget") === "on" ? formData.get("targetValue") : "",
    unit: formData.get("hasTarget") === "on" ? (formData.get("unit") ?? "") : "",
    reminderTime: formData.get("hasReminder") === "on" ? (formData.get("reminderTime") ?? "") : "",
  });
}

function toRow(input: HabitInput): HabitWrite {
  return {
    name: input.name,
    description: input.description,
    icon: input.icon,
    color: input.color,
    category: input.category,
    schedule_days: input.scheduleDays,
    weekly_goal: input.weeklyGoal,
    target_value: input.targetValue,
    unit: input.targetValue == null ? null : input.unit,
    reminder_time: input.reminderTime,
  };
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createHabit(_: HabitFormState, formData: FormData): Promise<HabitFormState> {
  const repo = await getRepo();
  const parsed = parseHabitForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Please check the highlighted fields." };

  try {
    await repo.insertHabit({ ...toRow(parsed.data), created_on: await getToday() });
  } catch (err) {
    console.error(err);
    return { message: "We couldn't save your habit. Please try again." };
  }
  refresh();
  redirect(`/today?created=${encodeURIComponent(parsed.data.name)}`);
}

export async function updateHabit(id: string, _: HabitFormState, formData: FormData): Promise<HabitFormState> {
  const repo = await getRepo();
  if (!uuid.safeParse(id).success) return { message: "That habit doesn't exist." };
  const parsed = parseHabitForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Please check the highlighted fields." };

  let found: boolean;
  try {
    found = await repo.updateHabit(id, toRow(parsed.data));
  } catch (err) {
    console.error(err);
    return { message: "We couldn't save your changes. Please try again." };
  }
  if (!found) return { message: "That habit doesn't exist or isn't yours." };
  refresh();
  redirect(`/habits/${id}?saved=1`);
}

async function mutate(id: string, fn: () => Promise<boolean>, failure: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, message: "That habit doesn't exist." };
  try {
    if (!(await fn())) return { ok: false, message: "That habit doesn't exist." };
  } catch (err) {
    console.error(err);
    return { ok: false, message: failure };
  }
  refresh();
  return { ok: true };
}

export async function archiveHabit(id: string) {
  const repo = await getRepo();
  return mutate(id, () => repo.setHabitArchived(id, true), "We couldn't archive that habit. Please try again.");
}

export async function restoreHabit(id: string) {
  const repo = await getRepo();
  return mutate(id, () => repo.setHabitArchived(id, false), "We couldn't restore that habit. Please try again.");
}

export async function deleteHabit(id: string): Promise<ActionResult> {
  const repo = await getRepo();
  return mutate(id, () => repo.deleteHabit(id), "We couldn't delete that habit. Please try again.");
}

const completionSchema = z.object({
  habitId: uuid,
  date: isoDateSchema,
  /** For measurable habits, the amount logged. */
  value: z.number().min(0).max(100000).nullable(),
  /** false removes the day's record (undo). */
  done: z.boolean(),
});

/**
 * Mark a habit done (or undo it) for a given day. The date is validated
 * against the user's own timezone, so nobody can log a day that hasn't
 * happened yet, and one row per habit per day is enforced by the database.
 */
export async function setCompletion(input: z.infer<typeof completionSchema>): Promise<ActionResult> {
  const repo = await getRepo();
  const parsed = completionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That didn't look right. Please try again." };
  const { habitId, date, value, done } = parsed.data;

  const today = await getToday();
  if (date > today) return { ok: false, message: "You can't log a day that hasn't happened yet." };
  if (date < addDays(today, -366)) return { ok: false, message: "You can only edit the last year of history." };

  try {
    const row = await repo.getHabit(habitId);
    if (!row) return { ok: false, message: "That habit doesn't exist." };
    const habit = mapHabit(row);
    if (habit.archivedAt) return { ok: false, message: "Restore this habit before logging it." };
    if (!isScheduledOn(habit, date)) return { ok: false, message: "This habit isn't scheduled for that day." };

    if (!done || (habit.targetValue != null && (value ?? 0) <= 0)) {
      await repo.deleteCompletion(habitId, date);
      refresh();
      return { ok: true };
    }

    const amount = habit.targetValue != null ? (value ?? habit.targetValue) : null;
    await repo.upsertCompletion(habitId, date, amount);
    const achievements = meetsTarget(habit, amount) ? await awardAchievements(repo, today) : [];
    refresh();
    return { ok: true, achievements };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "We couldn't save that. Please try again." };
  }
}
