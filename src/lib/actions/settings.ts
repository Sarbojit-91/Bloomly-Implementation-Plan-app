"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/backend";
import { getRepo, requireUser } from "@/lib/data";
import { fieldErrors, profileSchema } from "@/lib/validation";

export interface SettingsFormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  savedAt?: number;
}

export async function updateProfile(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const repo = await getRepo();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  try {
    await repo.updateProfile({ display_name: parsed.data.displayName, timezone: parsed.data.timezone });
  } catch {
    return { message: "We couldn't save your profile. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved.", savedAt: Date.now() };
}

const themeSchema = z.enum(["light", "dark", "system"]);

export async function updateTheme(theme: string): Promise<{ ok: boolean }> {
  const repo = await getRepo();
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { ok: false };
  try {
    await repo.updateProfile({ theme: parsed.data });
  } catch {
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateReminders(enabled: boolean): Promise<{ ok: boolean }> {
  const repo = await getRepo();
  try {
    await repo.updateProfile({ reminders_enabled: Boolean(enabled) });
  } catch {
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Permanently deletes the signed-in user's account. Every Bloomly table
 * references the auth user with ON DELETE CASCADE, so this removes all of
 * their habits, completions, journal entries and achievements too.
 */
export async function deleteAccount(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    return { errors: { confirm: "Type DELETE (in capitals) to confirm." } };
  }
  const { error } = await (await getAuth()).deleteAccount(user.id);
  if (error) return { message: error.message };
  redirect("/sign-in?deleted=1");
}
