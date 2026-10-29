/**
 * Calendar-date helpers.
 *
 * Bloomly stores every habit completion and journal entry as a plain calendar
 * date ("YYYY-MM-DD") in the user's own timezone. All arithmetic here works on
 * those strings via UTC midnight, so it never shifts because of the machine's
 * local timezone or daylight-saving changes.
 */

export type ISODate = string; // "YYYY-MM-DD"

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUTC(date: ISODate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(date: ISODate): number {
  return toUTC(date).getUTCDay();
}

/** Weeks start on Monday. */
export function startOfWeek(date: ISODate): ISODate {
  const dow = dayOfWeek(date);
  return addDays(date, -((dow + 6) % 7));
}

export function endOfWeek(date: ISODate): ISODate {
  return addDays(startOfWeek(date), 6);
}

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: ISODate): ISODate {
  const d = toUTC(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return fromUTC(d);
}

export function addMonths(date: ISODate, months: number): ISODate {
  const d = toUTC(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return fromUTC(d);
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

/** Inclusive list of dates from `from` to `to`. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The current calendar date in an IANA timezone, e.g. "Asia/Kolkata". */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): ISODate {
  return dateInTimeZone(now, timeZone);
}

export function dateInTimeZone(instant: Date, timeZone: string): ISODate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Current "HH:MM" (24h) in a timezone. */
export function timeInTimeZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/** Hour of the day (0–23) in a timezone, used for greetings. */
export function hourInTimeZone(timeZone: string, now: Date = new Date()): number {
  return Number(timeInTimeZone(timeZone, now).slice(0, 2));
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function safeTimeZone(timeZone: string | null | undefined): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
}

const longFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const shortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const weekdayShortFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

/** "Thursday, October 29" */
export function formatLong(date: ISODate): string {
  return longFmt.format(toUTC(date));
}

/** "Oct 29" */
export function formatShort(date: ISODate): string {
  return shortFmt.format(toUTC(date));
}

/** "October 2026" */
export function formatMonth(date: ISODate): string {
  return monthFmt.format(toUTC(date));
}

/** "Thu" */
export function formatWeekdayShort(date: ISODate): string {
  return weekdayShortFmt.format(toUTC(date));
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Display order for weekday pickers (Monday first). */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
