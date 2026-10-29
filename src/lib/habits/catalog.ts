import type { ISODate } from "@/lib/dates";
import type { HabitCore } from "./model";

export const CATEGORIES = [
  { value: "health", label: "Health" },
  { value: "fitness", label: "Fitness" },
  { value: "learning", label: "Learning" },
  { value: "productivity", label: "Productivity" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "personal", label: "Personal" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Personal";
}

/** Curated habit colours. `hex` is the solid swatch; tints are derived in CSS. */
export const COLORS = [
  { value: "violet", label: "Violet", hex: "#7c4dff" },
  { value: "plum", label: "Plum", hex: "#a046c8" },
  { value: "rose", label: "Rose", hex: "#e2558c" },
  { value: "peach", label: "Peach", hex: "#f0845c" },
  { value: "amber", label: "Amber", hex: "#d9a21b" },
  { value: "mint", label: "Mint", hex: "#2fae84" },
  { value: "teal", label: "Teal", hex: "#1e9bb0" },
  { value: "sky", label: "Sky", hex: "#4a7fe8" },
] as const;

export type HabitColor = (typeof COLORS)[number]["value"];

export function colorHex(value: string): string {
  return COLORS.find((c) => c.value === value)?.hex ?? COLORS[0].hex;
}

/** Icon names offered in the picker. They map to Lucide icons in `HabitIcon`. */
export const ICONS = [
  "Sprout",
  "BookOpen",
  "Dumbbell",
  "Footprints",
  "Bike",
  "Droplets",
  "Apple",
  "Moon",
  "Sun",
  "Brain",
  "Code",
  "GraduationCap",
  "Languages",
  "PenLine",
  "NotebookPen",
  "Music",
  "Palette",
  "Heart",
  "Leaf",
  "Coffee",
  "Briefcase",
  "Timer",
  "Phone",
  "Sparkles",
] as const;

export type IconName = (typeof ICONS)[number];

/** A habit as the app uses it (database row mapped to camelCase). */
export interface Habit extends HabitCore {
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: Category;
  unit: string | null;
  /** "HH:MM" in the user's timezone, or null. */
  reminderTime: string | null;
  archivedAt: string | null;
  sortOrder: number;
}

export interface Completion {
  id: string;
  habitId: string;
  date: ISODate;
  value: number | null;
}

export interface JournalEntry {
  id: string;
  date: ISODate;
  mood: number | null;
  reflection: string;
  notes: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  theme: "light" | "dark" | "system";
  remindersEnabled: boolean;
}

export const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

export function moodFor(value: number | null | undefined) {
  return MOODS.find((m) => m.value === value) ?? null;
}

export function describeSchedule(habit: Pick<HabitCore, "scheduleDays" | "weeklyGoal">): string {
  const days = [...habit.scheduleDays].sort();
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const isEveryDay = days.length === 7;
  const isWeekdays = days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
  const isWeekend = days.length === 2 && days.includes(0) && days.includes(6);
  const where = isEveryDay
    ? "any day"
    : isWeekdays
      ? "weekdays"
      : isWeekend
        ? "weekends"
        : [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => names[d]).join(", ");

  if (habit.weeklyGoal >= days.length) {
    if (isEveryDay) return "Every day";
    if (isWeekdays) return "Weekdays";
    if (isWeekend) return "Weekends";
    return where;
  }
  return `${habit.weeklyGoal}× a week · ${where}`;
}

export function formatAmount(value: number, unit: string | null): string {
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  return unit ? `${n} ${unit}` : n;
}
