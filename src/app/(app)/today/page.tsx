import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Flame, Plus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { getProfile, listActiveHabits, listCompletions, listJournalEntries } from "@/lib/data";
import { addDays, dayOfWeek, formatLong, hourInTimeZone, todayInTimeZone, WEEKDAY_LABELS } from "@/lib/dates";
import { buildDoneSet, buildValueMap, effectiveStart, isScheduledOn, isStrict, weekCount, weekGoal } from "@/lib/habits/model";
import { computeStreak, formatStreak } from "@/lib/habits/streaks";
import { comparePeriods } from "@/lib/habits/stats";
import { describeSchedule, moodFor } from "@/lib/habits/catalog";
import { dailySeed, greeting } from "@/lib/encouragement";
import { ButtonLink } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { HabitIcon } from "@/components/habits/habit-icon";
import { TodayBoard, type TodayItem } from "@/components/today/today-board";
import { FlashToast } from "@/components/app/flash-toast";
import { EmptyGarden } from "@/components/today/empty-garden";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage(props: PageProps<"/today">) {
  const sp = await props.searchParams;
  const [profile, habits, completions, journal] = await Promise.all([
    getProfile(),
    listActiveHabits(),
    listCompletions(),
    listJournalEntries(),
  ]);
  const today = todayInTimeZone(profile.timezone);
  const hello = greeting(hourInTimeZone(profile.timezone));
  const firstName = profile.displayName.split(" ")[0];

  const flash =
    typeof sp.created === "string"
      ? { tone: "success" as const, title: `“${sp.created}” has been planted 🌱`, description: "Find it in your garden." }
      : sp.welcome === "verified"
        ? { tone: "celebrate" as const, title: "Your email is confirmed!", description: "Welcome to Bloomly." }
        : sp.welcome === "password"
          ? { tone: "success" as const, title: "Password updated", description: "You're all set." }
          : null;

  const header = (
    <header className="animate-fade-up">
      <p className="text-sm font-medium text-accent">{formatLong(today)}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {hello}
        {firstName ? `, ${firstName}` : ""}
      </h1>
    </header>
  );

  if (habits.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {flash && <FlashToast {...flash} />}
        {header}
        <EmptyGarden />
      </div>
    );
  }

  const items: TodayItem[] = [];
  const later: { id: string; name: string; icon: string; color: string; next: string; schedule: string }[] = [];

  for (const h of habits) {
    const done = buildDoneSet(h, completions);
    const start = effectiveStart(h, completions);
    if (isScheduledOn(h, today)) {
      const streak = computeStreak(h, completions, today);
      items.push({
        habit: h,
        value: buildValueMap(h, completions).get(today) ?? null,
        done: done.has(today),
        strict: isStrict(h),
        weekBefore: weekCount(h, done, today, addDays(today, -1)),
        weekGoal: weekGoal(h, today, start),
        streak: streak.current,
        streakUnit: streak.unit,
        schedule: describeSchedule(h),
      });
    } else {
      let next = addDays(today, 1);
      while (!isScheduledOn(h, next)) next = addDays(next, 1);
      later.push({
        id: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        next: next === addDays(today, 1) ? "Tomorrow" : WEEKDAY_LABELS[dayOfWeek(next)],
        schedule: describeSchedule(h),
      });
    }
  }

  const week = comparePeriods(habits, completions, "week", today);
  const streaks = habits
    .map((h) => ({ h, s: computeStreak(h, completions, today) }))
    .filter(({ s }) => s.current > 0)
    .sort((a, b) => b.s.current - a.s.current)
    .slice(0, 3);
  const todayEntry = journal.find((j) => j.date === today);
  const mood = moodFor(todayEntry?.mood);

  return (
    <div className="flex flex-col gap-8">
      {flash && <FlashToast {...flash} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {header}
        <ButtonLink href="/habits/new" className="animate-fade-up">
          <Plus className="size-4" aria-hidden /> New habit
        </ButtonLink>
      </div>

      <TodayBoard items={items} today={today} seed={dailySeed(today)} />

      <section aria-labelledby="highlights" className="grid gap-4 md:grid-cols-3">
        <h2 id="highlights" className="sr-only">
          Highlights
        </h2>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Flame className="size-4" style={{ color: "#f0845c" }} aria-hidden /> Current streaks
          </div>
          {streaks.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Complete a habit today to start your first streak.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {streaks.map(({ h, s }) => (
                <li key={h.id} className="flex items-center gap-3">
                  <HabitIcon icon={h.icon} color={h.color} size="sm" />
                  <Link href={`/habits/${h.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                    {h.name}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold text-ink">{formatStreak(s.current, s.unit)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <CalendarCheck2 className="size-4 text-primary" aria-hidden /> This week
          </div>
          {week.current.rate == null ? (
            <p className="mt-3 text-sm text-ink-soft">Your weekly completion rate will appear after your first check-in.</p>
          ) : (
            <>
              <p className="mt-2 font-display text-4xl font-semibold">{Math.round(week.current.rate * 100)}%</p>
              <p className="mt-1 text-sm text-ink-soft">
                {week.current.completed} check-in{week.current.completed === 1 ? "" : "s"} so far
              </p>
              {week.deltaPoints != null && week.deltaPoints !== 0 && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted">
                  {week.deltaPoints > 0 ? (
                    <TrendingUp className="size-3.5 text-success" aria-hidden />
                  ) : (
                    <TrendingDown className="size-3.5" aria-hidden />
                  )}
                  {Math.abs(week.deltaPoints)} pts {week.deltaPoints > 0 ? "above" : "below"} last week
                </p>
              )}
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Sparkles className="size-4 text-accent" aria-hidden /> Today&apos;s reflection
          </div>
          {todayEntry ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium">
                {mood && (
                  <span className="text-2xl" aria-hidden>
                    {mood.emoji}
                  </span>
                )}
                {mood ? `Feeling ${mood.label.toLowerCase()}` : "Entry saved"}
              </p>
              {todayEntry.reflection && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{todayEntry.reflection}</p>}
              <Link href="/journal" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Edit entry <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-soft">How are you feeling today? A few words is plenty.</p>
              <Link href="/journal" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Write a reflection <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </>
          )}
        </Card>
      </section>

      {later.length > 0 && (
        <section aria-labelledby="later" className="flex flex-col gap-3">
          <SectionTitle title="Resting today" subtitle="Not scheduled today, so there's nothing to do here." as="h2" />
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" id="later">
            {later.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/habits/${l.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3 transition hover:border-accent hover:bg-surface"
                >
                  <HabitIcon icon={l.icon} color={l.color} size="sm" className="opacity-70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{l.name}</span>
                    <span className="block text-xs text-muted">{l.schedule}</span>
                  </span>
                  <span className="text-xs font-medium text-muted">Next: {l.next}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
