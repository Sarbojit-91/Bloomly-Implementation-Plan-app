import { addDays, dayOfWeek, endOfWeek, eachDay, maxDate, minDate, startOfWeek, type ISODate } from "@/lib/dates";

/**
 * The minimum a habit needs for schedule and progress calculations.
 *
 * `scheduleDays` lists the weekdays (0 = Sunday … 6 = Saturday) the habit is
 * planned for. `weeklyGoal` is how many of those days per week count as a full
 * week. When the goal equals the number of scheduled days the habit is *strict*
 * (every scheduled day is expected); when it is lower the habit is *flexible*
 * (e.g. "3 times a week, any day") and success is judged per week instead.
 */
export interface HabitCore {
  id: string;
  scheduleDays: number[];
  weeklyGoal: number;
  targetValue: number | null;
  /** The user-local calendar date the habit was created. */
  createdOn: ISODate;
}

export interface CompletionCore {
  habitId: string;
  date: ISODate;
  /** Amount logged for measurable habits; null for simple check-offs. */
  value: number | null;
}

export type DayStatus =
  | "done" // goal for the day reached
  | "partial" // some progress on a measurable habit
  | "pending" // today, not done yet
  | "missed" // past scheduled day of a strict habit that wasn't logged
  | "open" // past scheduled day of a flexible habit that wasn't logged (not a miss)
  | "unscheduled" // not planned for this day
  | "future"
  | "inactive"; // before the habit started

export function isStrict(habit: Pick<HabitCore, "scheduleDays" | "weeklyGoal">): boolean {
  return habit.weeklyGoal >= habit.scheduleDays.length;
}

export function isScheduledOn(habit: Pick<HabitCore, "scheduleDays">, date: ISODate): boolean {
  return habit.scheduleDays.includes(dayOfWeek(date));
}

export function meetsTarget(habit: Pick<HabitCore, "targetValue">, value: number | null): boolean {
  if (habit.targetValue == null || habit.targetValue <= 0) return true;
  return (value ?? 0) >= habit.targetValue;
}

/** Index completions of one habit by date, keeping only those that meet the target. */
export function buildDoneSet(habit: HabitCore, completions: CompletionCore[]): Set<ISODate> {
  const done = new Set<ISODate>();
  for (const c of completions) {
    if (c.habitId === habit.id && meetsTarget(habit, c.value)) done.add(c.date);
  }
  return done;
}

export function buildValueMap(habit: HabitCore, completions: CompletionCore[]): Map<ISODate, number | null> {
  const map = new Map<ISODate, number | null>();
  for (const c of completions) if (c.habitId === habit.id) map.set(c.date, c.value);
  return map;
}

/**
 * The first day the habit "counts" from: its creation date, or the earliest
 * back-filled completion if the user logged days before creating it.
 */
export function effectiveStart(habit: HabitCore, completions: CompletionCore[]): ISODate {
  let start = habit.createdOn;
  for (const c of completions) if (c.habitId === habit.id && c.date < start) start = c.date;
  return start;
}

/** Completions in the week containing `date`, counting only days up to `upTo`. */
export function weekCount(
  habit: HabitCore,
  done: Set<ISODate>,
  date: ISODate,
  upTo: ISODate = endOfWeek(date),
): number {
  let n = 0;
  const end = minDate(endOfWeek(date), upTo);
  for (let d = startOfWeek(date); d <= end; d = addDays(d, 1)) {
    if (done.has(d) && isScheduledOn(habit, d)) n++;
  }
  return n;
}

/**
 * The weekly goal adjusted for the habit's first week: a daily habit created
 * on a Friday can only reach 3 completions that week, so that's its goal.
 */
export function weekGoal(habit: HabitCore, weekDate: ISODate, start: ISODate): number {
  const from = maxDate(startOfWeek(weekDate), start);
  const to = endOfWeek(weekDate);
  if (from > to) return 0;
  const available = eachDay(from, to).filter((d) => isScheduledOn(habit, d)).length;
  return Math.min(habit.weeklyGoal, available);
}

/** Status of a single habit on a single day, for calendars and history. */
export function dayStatus(
  habit: HabitCore,
  date: ISODate,
  today: ISODate,
  done: Set<ISODate>,
  values: Map<ISODate, number | null>,
  start: ISODate,
): DayStatus {
  if (date > today) return isScheduledOn(habit, date) ? "future" : "unscheduled";
  if (done.has(date)) return "done";
  if (date < start) return "inactive";
  if (!isScheduledOn(habit, date)) return "unscheduled";
  const v = values.get(date);
  if (v != null && v > 0) return "partial";
  if (date === today) return "pending";
  return isStrict(habit) ? "missed" : "open";
}

/**
 * Whether a habit belongs in today's checklist count. Strict habits count on
 * every scheduled day. Flexible habits stop counting once the weekly goal has
 * been met (unless they were also done today), so finishing early never makes
 * the day look incomplete.
 */
export function isDueToday(habit: HabitCore, today: ISODate, done: Set<ISODate>): boolean {
  if (!isScheduledOn(habit, today)) return false;
  if (isStrict(habit) || done.has(today)) return true;
  const before = weekCount(habit, done, today, addDays(today, -1));
  return before < habit.weeklyGoal;
}
