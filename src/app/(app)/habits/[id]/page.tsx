import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, CalendarDays, Flame, Hash, Percent, Trophy } from "lucide-react";
import { getHabit, getProfile, listAchievements, listCompletions } from "@/lib/data";
import {
  addDays,
  addMonths,
  dateInTimeZone,
  formatLong,
  formatShort,
  isISODate,
  startOfMonth,
  todayInTimeZone,
} from "@/lib/dates";
import { buildDoneSet, effectiveStart } from "@/lib/habits/model";
import { computeStreak, formatStreak } from "@/lib/habits/streaks";
import { currentPeriod, habitRate, totalCompletions } from "@/lib/habits/stats";
import { categoryLabel, colorHex, describeSchedule, formatAmount } from "@/lib/habits/catalog";
import { ACHIEVEMENTS } from "@/lib/habits/achievements";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitActions } from "@/components/habits/habit-actions";
import { HabitCalendar } from "@/components/history/habit-calendar";
import { Heatmap } from "@/components/history/heatmap";
import { FlashToast } from "@/components/app/flash-toast";
import { Alert, Badge, Card, SectionTitle } from "@/components/ui/primitives";

export async function generateMetadata(props: PageProps<"/habits/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const habit = await getHabit(id);
  return { title: habit?.name ?? "Habit" };
}

export default async function HabitDetailPage(props: PageProps<"/habits/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [habit, profile, allCompletions, achievements] = await Promise.all([
    getHabit(id),
    getProfile(),
    listCompletions(),
    listAchievements(),
  ]);
  if (!habit) notFound();

  const today = todayInTimeZone(profile.timezone);
  const completions = allCompletions.filter((c) => c.habitId === habit.id);
  const start = effectiveStart(habit, completions);
  const streak = computeStreak(habit, completions, today);
  const total = totalCompletions(habit, completions);
  const week = currentPeriod("week", today);
  const month = currentPeriod("month", today);
  const weekRate = habitRate(habit, completions, week.from, week.to, today).rate;
  const monthRate = habitRate(habit, completions, month.from, month.to, today).rate;
  const allTimeRate = habitRate(habit, completions, start, today, today).rate;

  // Month shown in the calendar (?month=YYYY-MM), limited to the habit's lifetime.
  const requested = typeof sp.month === "string" && isISODate(`${sp.month}-01`) ? `${sp.month}-01` : startOfMonth(today);
  const earliestMonth = startOfMonth(addDays(today, -366) > start ? addDays(today, -366) : start);
  const calMonth = requested > startOfMonth(today) ? startOfMonth(today) : requested < earliestMonth ? earliestMonth : requested;
  const prevMonth = addMonths(calMonth, -1);
  const nextMonth = addMonths(calMonth, 1);

  const values: Record<string, number | null> = {};
  for (const c of completions) values[c.date] = c.value;
  const heat: Record<string, number> = {};
  for (const d of buildDoneSet(habit, completions)) heat[d] = 1;

  const recent = [...completions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const badges = achievements.filter((a) => a.habitId === habit.id);
  const hex = colorHex(habit.color);

  const stats = [
    { label: "Current streak", value: formatStreak(streak.current, streak.unit), icon: Flame },
    { label: "Longest streak", value: formatStreak(streak.longest, streak.unit), icon: Trophy },
    { label: "Total completions", value: String(total), icon: Hash },
    { label: "This week", value: weekRate == null ? "—" : `${Math.round(weekRate * 100)}%`, icon: CalendarDays },
    { label: "This month", value: monthRate == null ? "—" : `${Math.round(monthRate * 100)}%`, icon: Percent },
  ];

  return (
    <div className="flex flex-col gap-8">
      {sp.saved === "1" && <FlashToast tone="success" title="Changes saved" />}
      <Link href="/habits" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> All habits
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between animate-fade-up">
        <div className="flex items-start gap-4">
          <HabitIcon icon={habit.icon} color={habit.color} size="lg" />
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{habit.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{describeSchedule(habit)}</Badge>
              <Badge>{categoryLabel(habit.category)}</Badge>
              {habit.targetValue != null && <Badge>Target: {formatAmount(habit.targetValue, habit.unit)}</Badge>}
              {habit.reminderTime && <Badge>⏰ {habit.reminderTime}</Badge>}
            </div>
            {habit.description && <p className="mt-3 max-w-xl text-ink-soft">{habit.description}</p>}
          </div>
        </div>
        <HabitActions id={habit.id} name={habit.name} archived={Boolean(habit.archivedAt)} afterDelete="/habits" />
      </header>

      {habit.archivedAt && (
        <Alert tone="info">This habit is archived. Its history is here to explore; restore it to start logging again.</Alert>
      )}

      <section aria-label="Stats" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <s.icon className="size-3.5" aria-hidden style={{ color: hex }} /> {s.label}
            </p>
            <p className="mt-1.5 font-display text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </section>
      {streak.isPersonalBest && streak.current >= 3 && (
        <Alert tone="success">🌟 You&apos;re on your best streak ever for this habit. Lovely consistency!</Alert>
      )}

      <Card className="p-6">
        <SectionTitle
          title="Calendar"
          subtitle="Tap any day to see it, log it or undo it. Days this habit isn't scheduled are never counted as missed."
        />
        <div className="mt-5">
          <HabitCalendar
            key={calMonth}
            habit={habit}
            month={calMonth}
            today={today}
            start={start}
            values={values}
            prevHref={prevMonth >= earliestMonth ? `/habits/${habit.id}?month=${prevMonth.slice(0, 7)}` : null}
            nextHref={nextMonth <= startOfMonth(today) ? `/habits/${habit.id}?month=${nextMonth.slice(0, 7)}` : null}
          />
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle
          title="The past year"
          subtitle={allTimeRate == null ? "Your activity will grow here." : `${Math.round(allTimeRate * 100)}% completion since ${formatLong(start)}`}
        />
        <div className="mt-5">
          <Heatmap counts={heat} today={today} max={1} color={hex} label={`${habit.name} activity`} unit="completion" />
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title="Recent check-ins" />
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No check-ins yet. Your first one is just a tap away on Today.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{formatLong(c.date)}</span>
                  <span className="text-muted">
                    {c.value != null ? formatAmount(c.value, habit.unit) : "Done"}
                    {c.date === today && " · today"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <SectionTitle title="Milestones" subtitle="Achievements earned with this habit." />
          {badges.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Milestones like a 7-day streak or 30 completions will appear here.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {badges.map((b) => (
                <li key={b.key} className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-tint text-primary">
                    <Award className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{ACHIEVEMENTS[b.key]?.title ?? b.key}</span>
                    <span className="block text-xs text-muted">Earned {formatShort(dateInTimeZone(new Date(b.earnedAt), profile.timezone))}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
