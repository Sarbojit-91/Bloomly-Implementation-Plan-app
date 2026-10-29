"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRepo, getToday } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { fieldErrors, journalSchema } from "@/lib/validation";
import { awardAchievements, type NewAchievement } from "@/lib/achievements-server";

export interface JournalFormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  achievements?: NewAchievement[];
  /** Bumped on each successful save so the client can react once. */
  savedAt?: number;
}

export async function saveJournalEntry(_: JournalFormState, formData: FormData): Promise<JournalFormState> {
  const repo = await getRepo();
  const parsed = journalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { date, mood, reflection, notes } = parsed.data;

  const today = await getToday();
  if (date > today) return { message: "You can't write an entry for a future day." };
  if (date < addDays(today, -366)) return { message: "Entries can only be edited for the past year." };
  if (mood == null && !reflection && !notes) {
    return { errors: { reflection: "Pick a mood or write a few words before saving." } };
  }

  try {
    await repo.upsertJournal({ entry_date: date, mood, reflection, notes });
  } catch (err) {
    console.error(err);
    return { message: "We couldn't save your entry. Please try again." };
  }

  const achievements = await awardAchievements(repo, today);
  revalidatePath("/journal");
  revalidatePath("/today");
  return { ok: true, message: "Thanks for taking a moment for yourself.", achievements, savedAt: Date.now() };
}

export async function deleteJournalEntry(id: string): Promise<{ ok: boolean; message?: string }> {
  const repo = await getRepo();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "That entry doesn't exist." };
  try {
    if (!(await repo.deleteJournal(id))) return { ok: false, message: "That entry doesn't exist." };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "We couldn't delete that entry. Please try again." };
  }
  revalidatePath("/journal");
  revalidatePath("/today");
  return { ok: true };
}
