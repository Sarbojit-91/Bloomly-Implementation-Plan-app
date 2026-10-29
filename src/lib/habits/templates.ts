import type { Category, HabitColor, IconName } from "./catalog";

export interface HabitTemplate {
  slug: string;
  name: string;
  description: string;
  icon: IconName;
  color: HabitColor;
  category: Category;
  scheduleDays: number[];
  weeklyGoal: number;
  targetValue: number | null;
  unit: string | null;
  /** Shown on the template card to explain why it's a good starting point. */
  tip: string;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** Starting points users can customise before adding. Not stored in the database. */
export const TEMPLATES: HabitTemplate[] = [
  {
    slug: "read",
    name: "Read every day",
    description: "A few pages of something you enjoy.",
    icon: "BookOpen",
    color: "violet",
    category: "learning",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 7,
    targetValue: 20,
    unit: "pages",
    tip: "Start small: even 10 pages adds up to a dozen books a year.",
  },
  {
    slug: "exercise",
    name: "Exercise regularly",
    description: "Move your body in a way that feels good.",
    icon: "Dumbbell",
    color: "peach",
    category: "fitness",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 3,
    targetValue: 30,
    unit: "minutes",
    tip: "Three times a week, any days you like. Rest days are part of the plan.",
  },
  {
    slug: "code",
    name: "Practice coding",
    description: "Build, solve or learn something with code.",
    icon: "Code",
    color: "sky",
    category: "learning",
    scheduleDays: WEEKDAYS,
    weeklyGoal: 5,
    targetValue: 45,
    unit: "minutes",
    tip: "Weekdays only, so weekends stay yours.",
  },
  {
    slug: "learn",
    name: "Learn something new",
    description: "An article, a lesson, a video, a new word.",
    icon: "GraduationCap",
    color: "teal",
    category: "learning",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 4,
    targetValue: null,
    unit: null,
    tip: "Four curious moments a week, whenever they fit.",
  },
  {
    slug: "meditate",
    name: "Meditate",
    description: "A few quiet minutes to breathe and notice.",
    icon: "Leaf",
    color: "mint",
    category: "mindfulness",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 7,
    targetValue: 10,
    unit: "minutes",
    tip: "Ten minutes is plenty. Consistency matters more than length.",
  },
  {
    slug: "water",
    name: "Drink enough water",
    description: "Stay hydrated through the day.",
    icon: "Droplets",
    color: "sky",
    category: "health",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 7,
    targetValue: 2,
    unit: "litres",
    tip: "Log as you go: tap + each time you finish a glass or bottle.",
  },
  {
    slug: "sleep",
    name: "Consistent sleep schedule",
    description: "In bed by the same time each night.",
    icon: "Moon",
    color: "plum",
    category: "health",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 7,
    targetValue: null,
    unit: null,
    tip: "Pair it with a reminder an hour before your bedtime.",
  },
  {
    slug: "journal",
    name: "Write a daily journal entry",
    description: "A few lines about your day.",
    icon: "NotebookPen",
    color: "rose",
    category: "personal",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 7,
    targetValue: null,
    unit: null,
    tip: "Bloomly's journal page is right there when you're ready.",
  },
  {
    slug: "walk",
    name: "Take a walk",
    description: "Fresh air and a few thousand steps.",
    icon: "Footprints",
    color: "mint",
    category: "fitness",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 5,
    targetValue: 5000,
    unit: "steps",
    tip: "Five days a week leaves room for busy ones.",
  },
  {
    slug: "deep-work",
    name: "Deep work session",
    description: "Focused time on what matters most.",
    icon: "Timer",
    color: "amber",
    category: "productivity",
    scheduleDays: WEEKDAYS,
    weeklyGoal: 5,
    targetValue: 90,
    unit: "minutes",
    tip: "Phone in another room, one task, one timer.",
  },
  {
    slug: "gratitude",
    name: "Note three good things",
    description: "Three small things that went well today.",
    icon: "Heart",
    color: "rose",
    category: "mindfulness",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 7,
    targetValue: null,
    unit: null,
    tip: "A gentle way to end the day.",
  },
  {
    slug: "screen-free",
    name: "Screen-free evening",
    description: "No screens for the last hour before bed.",
    icon: "Phone",
    color: "violet",
    category: "personal",
    scheduleDays: EVERY_DAY,
    weeklyGoal: 4,
    targetValue: null,
    unit: null,
    tip: "Four evenings a week is a great start.",
  },
];

export function findTemplate(slug: string | undefined | null): HabitTemplate | undefined {
  return slug ? TEMPLATES.find((t) => t.slug === slug) : undefined;
}
