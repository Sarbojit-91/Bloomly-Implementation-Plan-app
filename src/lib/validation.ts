import { z } from "zod";
import { isISODate, isValidTimeZone } from "@/lib/dates";
import { CATEGORIES, COLORS, ICONS } from "@/lib/habits/catalog";

export const emailSchema = z.string().trim().toLowerCase().email("Please enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "That's a bit long — please use 72 characters or fewer.")
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(1, "Tell us what to call you.").max(60, "Please keep it under 60 characters."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    timezone: z.string().refine(isValidTimeZone).catch("UTC"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password."),
});

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." });

export const isoDateSchema = z.string().refine(isISODate, "Invalid date.");

const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().positive("Must be more than 0.").max(100000, "That's a very big number.").nullable(),
);

export const habitSchema = z
  .object({
    name: z.string().trim().min(1, "Give your habit a name.").max(60, "Keep the name under 60 characters."),
    description: z
      .string()
      .trim()
      .max(280, "Keep the description under 280 characters.")
      .transform((v) => v || null),
    icon: z.enum(ICONS).catch("Sprout"),
    color: z.enum(COLORS.map((c) => c.value) as [string, ...string[]]).catch("violet"),
    category: z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]], { message: "Pick a category." }),
    scheduleDays: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Choose at least one day.")
      .transform((days) => [...new Set(days)].sort()),
    weeklyGoal: z.coerce.number().int().min(1, "Aim for at least once a week.").max(7),
    targetValue: optionalNumber,
    unit: z
      .string()
      .trim()
      .max(20, "Keep the unit short (20 characters).")
      .transform((v) => v || null),
    reminderTime: z
      .string()
      .trim()
      .transform((v) => v || null)
      .refine((v) => v === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Use a valid time."),
  })
  .refine((v) => v.weeklyGoal <= v.scheduleDays.length, {
    path: ["weeklyGoal"],
    message: "The weekly goal can't be more than the number of days you've picked.",
  })
  .refine((v) => v.targetValue == null || v.unit !== null, {
    path: ["unit"],
    message: "Add a unit for your target, like pages or minutes.",
  });

export type HabitInput = z.infer<typeof habitSchema>;

export const journalSchema = z.object({
  date: isoDateSchema,
  mood: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).max(5).nullable()),
  reflection: z.string().trim().max(2000, "Please keep your reflection under 2000 characters."),
  notes: z.string().trim().max(2000, "Please keep notes under 2000 characters."),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Tell us what to call you.").max(60),
  timezone: z.string().refine(isValidTimeZone, "Please choose a valid timezone."),
});

/** Flatten Zod issues into { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
