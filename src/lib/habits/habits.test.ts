import { describe, expect, it } from "vitest";
import { addDays, dateInTimeZone, dayOfWeek, endOfMonth, startOfWeek } from "@/lib/dates";
import { buildDoneSet, buildValueMap, dayStatus, isDueToday, isScheduledOn, type CompletionCore, type HabitCore } from "./model";
import { computeStreak } from "./streaks";
import { comparePeriods, habitRate, overallRate, rankHabits, todayProgress } from "./stats";
import { evaluateAchievements } from "./achievements";

// 2026-10-26 is a Monday.
const MON = "2026-10-26";
const TUE = "2026-10-27";
const WED = "2026-10-28";
const THU = "2026-10-29";
const FRI = "2026-10-30";

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const MWF = [1, 3, 5];

function habit(over: Partial<HabitCore> = {}): HabitCore {
  const scheduleDays = over.scheduleDays ?? DAILY;
  return {
    id: "h1",
    scheduleDays,
    weeklyGoal: over.weeklyGoal ?? scheduleDays.length,
    targetValue: null,
    createdOn: "2026-09-01",
    ...over,
  };
}

const done = (habitId: string, ...dates: string[]): CompletionCore[] =>
  dates.map((date) => ({ habitId, date, value: null }));

describe("dates", () => {
  it("knows weekdays and week starts", () => {
    expect(dayOfWeek(MON)).toBe(1);
    expect(startOfWeek(THU)).toBe(MON);
    expect(startOfWeek("2026-11-01")).toBe(MON); // Sunday belongs to the Monday week
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("resolves 'today' per timezone across the date line", () => {
    const instant = new Date("2026-10-29T20:30:00Z");
    expect(dateInTimeZone(instant, "UTC")).toBe("2026-10-29");
    expect(dateInTimeZone(instant, "Asia/Kolkata")).toBe("2026-10-30"); // 02:00 next day
    expect(dateInTimeZone(instant, "America/Los_Angeles")).toBe("2026-10-29");
    expect(dateInTimeZone(new Date("2026-10-30T03:00:00Z"), "America/Los_Angeles")).toBe("2026-10-29");
  });

  it("is unaffected by daylight-saving transitions", () => {
    // US DST ends 2026-11-01; adding days must not skip or repeat a date.
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
});

describe("scheduled habits", () => {
  const h = habit({ scheduleDays: MWF });

  it("only schedules the chosen weekdays", () => {
    expect(isScheduledOn(h, MON)).toBe(true);
    expect(isScheduledOn(h, TUE)).toBe(false);
    expect(isScheduledOn(h, WED)).toBe(true);
  });

  it("does not treat an unscheduled Tuesday as missed", () => {
    const c = done("h1", MON);
    const status = dayStatus(h, TUE, THU, buildDoneSet(h, c), buildValueMap(h, c), "2026-09-01");
    expect(status).toBe("unscheduled");
  });

  it("marks a past scheduled day without a completion as missed", () => {
    const status = dayStatus(h, WED, THU, new Set(), new Map(), "2026-09-01");
    expect(status).toBe("missed");
  });

  it("shows today as pending, not missed", () => {
    expect(dayStatus(h, WED, WED, new Set(), new Map(), "2026-09-01")).toBe("pending");
  });

  it("is not due on unscheduled days", () => {
    expect(isDueToday(h, TUE, new Set())).toBe(false);
    expect(isDueToday(h, WED, new Set())).toBe(true);
  });

  it("flexible habits are 'open' rather than missed, and drop off once the week's goal is met", () => {
    const flex = habit({ scheduleDays: DAILY, weeklyGoal: 2 });
    expect(dayStatus(flex, TUE, THU, new Set(), new Map(), "2026-09-01")).toBe("open");
    const set = buildDoneSet(flex, done("h1", MON, TUE));
    expect(isDueToday(flex, WED, set)).toBe(false);
  });
});

describe("measurable targets", () => {
  const h = habit({ targetValue: 20 });

  it("counts a day as done only when the target is reached", () => {
    const c: CompletionCore[] = [
      { habitId: "h1", date: MON, value: 12 },
      { habitId: "h1", date: TUE, value: 20 },
    ];
    const set = buildDoneSet(h, c);
    expect(set.has(MON)).toBe(false);
    expect(set.has(TUE)).toBe(true);
    expect(dayStatus(h, MON, THU, set, buildValueMap(h, c), "2026-09-01")).toBe("partial");
  });
});

describe("streaks", () => {
  it("counts consecutive days for a daily habit", () => {
    const s = computeStreak(habit(), done("h1", MON, TUE, WED), WED);
    expect(s).toMatchObject({ current: 3, longest: 3, unit: "day" });
  });

  it("does not break the streak because today isn't done yet", () => {
    const s = computeStreak(habit(), done("h1", MON, TUE, WED), THU);
    expect(s.current).toBe(3);
  });

  it("breaks after a missed scheduled day", () => {
    const s = computeStreak(habit(), done("h1", MON, WED, THU), THU);
    expect(s.current).toBe(2);
  });

  it("skips unscheduled days for a Mon/Wed/Fri habit", () => {
    const h = habit({ scheduleDays: MWF });
    const prevFri = "2026-10-23";
    const s = computeStreak(h, done("h1", prevFri, MON, WED), THU);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it("tracks the longest streak separately from the current one", () => {
    const c = done("h1", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", WED, THU);
    const s = computeStreak(habit(), c, THU);
    expect(s.current).toBe(2);
    expect(s.longest).toBe(4);
    expect(s.isPersonalBest).toBe(false);
  });

  it("uses weekly streaks for flexible habits", () => {
    const h = habit({ weeklyGoal: 3 });
    const lastWeek = ["2026-10-19", "2026-10-21", "2026-10-23"];
    const twoWeeksAgo = ["2026-10-12", "2026-10-13", "2026-10-14"];
    // This week has only 1 so far — still in progress, so it doesn't break the streak.
    const s = computeStreak(h, done("h1", ...twoWeeksAgo, ...lastWeek, TUE), THU);
    expect(s).toMatchObject({ current: 2, unit: "week" });
  });

  it("adjusts the first week's goal to the days available", () => {
    // Daily habit created on Friday 2026-10-23: that week only had Fri/Sat/Sun.
    const h = habit({ weeklyGoal: 3, createdOn: "2026-10-23" });
    const s = computeStreak(h, done("h1", "2026-10-23", "2026-10-24", "2026-10-25"), THU);
    expect(s.current).toBe(1);
  });
});

describe("completion rates", () => {
  it("only counts scheduled days and ignores today until it's done", () => {
    const h = habit({ scheduleDays: MWF });
    const r = habitRate(h, done("h1", MON), MON, "2026-11-01", WED);
    expect(r.expected).toBe(1); // Monday only; Wednesday (today) not done yet
    expect(r.rate).toBe(1);
  });

  it("ignores days before the habit was created", () => {
    const h = habit({ createdOn: WED });
    const r = habitRate(h, done("h1", WED), MON, FRI, THU);
    expect(r.expected).toBe(1);
    expect(r.rate).toBe(1);
  });

  it("prorates flexible habits", () => {
    const h = habit({ weeklyGoal: 3 }); // 3/7 per day
    const r = habitRate(h, done("h1", MON, TUE, WED), MON, "2026-11-01", "2026-11-02");
    expect(r.expected).toBeCloseTo(3);
    expect(r.rate).toBe(1);
  });

  it("compares with the previous period", () => {
    const h = habit();
    const lastWeek = ["2026-10-19", "2026-10-20", "2026-10-21"]; // 3 of 7
    const cmp = comparePeriods([h], done("h1", ...lastWeek, MON, TUE, WED), "week", THU);
    expect(cmp.current.rate).toBe(1);
    expect(cmp.previous.rate).toBeCloseTo(3 / 7);
    expect(cmp.deltaPoints).toBe(57);
  });

  it("caps over-achieving habits so they can't mask others", () => {
    const flex = habit({ id: "a", weeklyGoal: 1 });
    const strict = habit({ id: "b" });
    const c = [...done("a", MON, TUE, WED), ...done("b", MON)];
    const r = overallRate([flex, strict], c, MON, WED, WED);
    // flex: 3 done but only 3/7 expected (capped). strict: 1 of 2 (today not done yet is excluded).
    expect(r.rate).toBeCloseTo((3 / 7 + 1) / (3 / 7 + 2));
  });

  it("ranks habits by consistency and excludes ones with too little history", () => {
    const a = habit({ id: "a" });
    const b = habit({ id: "b" });
    const fresh = habit({ id: "c", createdOn: THU });
    const c = [...done("a", MON, TUE, WED), ...done("b", MON), ...done("c", THU)];
    const ranking = rankHabits([a, b, fresh], c, MON, THU);
    expect(ranking.map((r) => r.habitId)).toEqual(["a", "b"]);
  });
});

describe("today's progress", () => {
  it("counts only habits due today", () => {
    const daily = habit({ id: "a" });
    const mwf = habit({ id: "b", scheduleDays: MWF });
    expect(todayProgress([daily, mwf], done("a", TUE), TUE)).toEqual({ due: 1, done: 1 });
    expect(todayProgress([daily, mwf], done("b", WED), WED)).toEqual({ due: 2, done: 1 });
  });
});

describe("achievements", () => {
  it("awards nothing without records", () => {
    expect(evaluateAchievements([habit()], [], 0, THU)).toEqual([]);
  });

  it("awards first completion and seven-day streaks from real data", () => {
    // Monday 19th through Sunday 25th: a full week, all seven days.
    const dates = Array.from({ length: 7 }, (_, i) => addDays("2026-10-19", i));
    const keys = evaluateAchievements([habit()], done("h1", ...dates), 0, "2026-10-25").map((a) => a.key);
    expect(keys).toContain("first_bloom");
    expect(keys).toContain("streak_7");
    expect(keys).toContain("personal_best");
    expect(keys).toContain("weekly_goal");
    expect(keys).toContain("perfect_day");
    expect(keys).not.toContain("completions_30");
  });

  it("only awards the weekly goal for a full week's goal", () => {
    // Created Wednesday, done Wed–Sun: first week's adjusted goal is 5, not the full 7.
    const h = habit({ createdOn: "2026-10-21" });
    const c = done("h1", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25");
    const keys = evaluateAchievements([h], c, 0, "2026-10-25").map((a) => a.key);
    expect(keys).not.toContain("weekly_goal");
  });

  it("awards journal milestones", () => {
    const keys = evaluateAchievements([], [], 7, THU).map((a) => a.key);
    expect(keys).toEqual(["first_reflection", "reflections_7"]);
  });
});
