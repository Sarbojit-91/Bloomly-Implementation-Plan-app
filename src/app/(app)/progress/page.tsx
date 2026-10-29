import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Flame, Minus, Sparkles, Sun, Target } from "lucide-react";
import { getProfile, listAchievements, listCompletions, listHabits, listJournalEntries } from "@/lib/data";
import { addDays, dateInTimeZone, formatShort, todayInTimeZone } from "@/lib/dates";
import {
  comparePeriods,
  completionsByDate,
  currentPeriod,
  habitRate,
  perfectDays,
  previousPeriod,
  rankHabits,
  weeklyTrend,
  type PeriodKind,
} from "@/lib/habits/stats";
import { computeStreak, formatStreak } from "@/lib/habits/streaks";
import { ACHIEVEMENTS, type AchievementKey } from "@/lib/habits/achievements";
import { colorHex } from "@/lib/habits/catalog";
import { HabitIcon, Icon } from "@/components/habits/habit-icon";
import { Heatmap } from "@/components/history/heatmap";
import { DailyBarsChart, WeeklyTrendChart } from "@/components/progress/charts";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Progress" };

const pct = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);

function Delta({ points, label }: { points: number | null; label: string }) {
  if (points == null) return <span className="text-xs text-muted">No earlier {label} to compare yet</span>;
  const Icon = points > 0 ? ArrowUpRight : points < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", points > 0 ? "text-success" : "text-muted")}>
      <Icon className="size-3.5" aria-hidden />
      {points === 0 ? `Same as last ${label}` : `${Math.abs(points)} pts ${points > 0 ? "up" : "down"} on last ${label}`}
    </span>
  );
}

export default async function ProgressPage(props: PageProps<"/progress">) {
  const sp = await props.searchParams;
  const kind: PeriodKind = sp.period === "month" ? "month" : "week";
  const [profile, allHabits, completions, achievements, journal] = await Promise.all([
    getProfile(),
    listHabits(),
    listCompletions(),
    listAchievements(),
    listJournalEntries(),
  ]);
  const today = todayInTimeZone(profile.timezone);
  const habits = allHabits.filter((h) => !h.archivedAt);
  const periodLabel = kind;

  if (allHabits.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Progress" title="Your growth, over time" />
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Sparkles className="size-8 text-accent" aria-hidden />
          <h2 className="font-display text-xl font-semibold">Nothing to chart just yet</h2>
          <p className="max-w-sm text-sm text-muted">Add a habit and check in a few times. Your trends and insights will grow here.</p>
          <ButtonLink href="/templates" className="mt-2">
            Find a habit
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const cmp = comparePeriods(habits, completions, kind, today);
  const cur = currentPeriod(kind, today);
  const prev = previousPeriod(kind, today);
  const perfectInPeriod = perfectDays(habits, completions, cur.from, today).length;
  const trend = weeklyTrend(habits, completions, today, 12).map((p) => ({
    week: p.label,
    rate: p.rate == null ? null : Math.round(p.rate * 100),
    completed: p.completed,
  }));
  const byDate = completionsByDate(allHabits, completions);
  const daily = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29);
    return { date, count: byDate.get(date) ?? 0 };
  });
  const heat = Object.fromEntries(byDate);

  const perHabit = habits
    .map((h) => ({
      h,
      cur: habitRate(h, completions, cur.from, cur.to, today),
      prev: habitRate(h, completions, prev.from, prev.to, today),
    }))
    .sort((a, b) => (b.cur.rate ?? -1) - (a.cur.rate ?? -1));

  const consistent = rankHabits(habits, completions, addDays(today, -29), today).slice(0, 3);
  const habitById = new Map(allHabits.map((h) => [h.id, h]));

  const streaks = allHabits.map((h) => ({ h, s: computeStreak(h, completions, today) }));
  const bestCurrent = streaks.reduce<(typeof streaks)[number] | null>((best, x) => (!best || x.s.current > best.s.current ? x : best), null);
  const bestEver = streaks.reduce<(typeof streaks)[number] | null>((best, x) => (!best || x.s.longest > best.s.longest ? x : best), null);
  const totalAll = [...byDate.values()].reduce((a, b) => a + b, 0);
  const activeDays = byDate.size;

  const earned = new Map<AchievementKey, { count: number; first: string }>();
  for (const a of achievements) {
    const e = earned.get(a.key);
    if (!e) earned.set(a.key, { count: 1, first: a.earnedAt });
    else earned.set(a.key, { count: e.count + 1, first: a.earnedAt < e.first ? a.earnedAt : e.first });
  }
  const catalog = Object.values(ACHIEVEMENTS);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Progress"
        title="Your growth, over time"
        description="Every number here comes from your own check-ins. Rates only count days a habit was actually scheduled."
        action={
          <div role="tablist" aria-label="Period" className="inline-flex rounded-2xl bg-tint p-1">
            {(["week", "month"] as const).map((k) => (
              <Link
                key={k}
                role="tab"
                aria-selected={kind === k}
                href={k === "week" ? "/progress" : "/progress?period=month"}
                scroll={false}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium capitalize transition",
                  kind === k ? "bg-surface text-primary shadow-soft" : "text-ink-soft hover:text-ink",
                )}
              >
                This {k}
              </Link>
            ))}
          </div>
        }
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="col-span-2 p-5 lg:col-span-1">
          <p className="text-sm font-medium text-muted">Completion this {periodLabel}</p>
          <p className="mt-1 font-display text-4xl font-semibold">{pct(cmp.current.rate)}</p>
          <p className="mt-1 text-xs text-muted">Last {periodLabel}: {pct(cmp.previous.rate)}</p>
          <div className="mt-2">
            <Delta points={cmp.deltaPoints} label={periodLabel} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Target className="size-4 text-primary" aria-hidden /> Check-ins
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{cmp.current.completed}</p>
          <p className="mt-1 text-xs text-muted">vs {cmp.previous.completed} last {periodLabel}</p>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Sun className="size-4" style={{ color: "#d9a21b" }} aria-hidden /> Perfect days
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{perfectInPeriod}</p>
          <p className="mt-1 text-xs text-muted">Every planned habit done</p>
        </Card>
        <Card className="col-span-2 p-5 lg:col-span-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Flame className="size-4" style={{ color: "#e0703f" }} aria-hidden /> Best current streak
          </p>
          {bestCurrent && bestCurrent.s.current > 0 ? (
            <>
              <p className="mt-1 font-display text-3xl font-semibold">{formatStreak(bestCurrent.s.current, bestCurrent.s.unit)}</p>
              <p className="mt-1 truncate text-xs text-muted">{bestCurrent.h.name}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Check in today to start one.</p>
          )}
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title="Weekly completion rate" subtitle="All active habits, last 12 weeks" />
          <div className="mt-4">
            <WeeklyTrendChart data={trend} />
          </div>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted hover:text-primary">View as table</summary>
            <table className="mt-2 w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 font-medium">Week of</th>
                  <th className="py-1 font-medium">Rate</th>
                  <th className="py-1 font-medium">Check-ins</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.week} className="border-t border-line">
                    <td className="py-1">{formatShort(t.week)}</td>
                    <td className="py-1">{t.rate == null ? "—" : `${t.rate}%`}</td>
                    <td className="py-1">{t.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
        <Card className="p-6">
          <SectionTitle title="Daily check-ins" subtitle="Last 30 days" />
          <div className="mt-4">
            <DailyBarsChart data={daily} />
          </div>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted hover:text-primary">View as table</summary>
            <table className="mt-2 w-full text-left text-xs">
              <tbody>
                {daily.filter((d) => d.count > 0).map((d) => (
                  <tr key={d.date} className="border-t border-line">
                    <td className="py-1">{formatShort(d.date)}</td>
                    <td className="py-1">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <SectionTitle title="Habit by habit" subtitle={`This ${periodLabel} compared with last ${periodLabel}`} />
          <ul className="mt-5 flex flex-col gap-4">
            {perHabit.map(({ h, cur: c, prev: p }) => {
              const delta = c.rate != null && p.rate != null ? Math.round((c.rate - p.rate) * 100) : null;
              return (
                <li key={h.id} className="flex items-center gap-3">
                  <HabitIcon icon={h.icon} color={h.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/habits/${h.id}`} className="truncate text-sm font-medium hover:text-primary">
                        {h.name}
                      </Link>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{pct(c.rate)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-tint">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.round((c.rate ?? 0) * 100)}%`, backgroundColor: colorHex(h.color) }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {c.completed} done · {c.rate == null ? "nothing scheduled yet" : `${Math.round(c.expected * 10) / 10} planned`}
                      {delta != null && delta !== 0 && ` · ${delta > 0 ? "+" : "−"}${Math.abs(delta)} pts vs last ${periodLabel}`}
                    </p>
                  </div>
                </li>
              );
            })}
            {perHabit.length === 0 && <li className="text-sm text-muted">No active habits right now.</li>}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <SectionTitle title="Most consistent" subtitle="Last 30 days" />
            {consistent.length === 0 ? (
              <p className="mt-4 text-sm text-muted">After a few scheduled days, your steadiest habits will show up here.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {consistent.map((r, i) => {
                  const h = habitById.get(r.habitId)!;
                  return (
                    <li key={r.habitId} className="flex items-center gap-3">
                      <span className="grid size-7 place-items-center rounded-full bg-tint text-xs font-bold text-primary">{i + 1}</span>
                      <HabitIcon icon={h.icon} color={h.color} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{h.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{Math.round(r.rate * 100)}%</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
          <Card className="p-6">
            <SectionTitle title="Personal milestones" />
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted">Total check-ins</dt>
                <dd className="font-display text-2xl font-semibold">{totalAll}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Active days</dt>
                <dd className="font-display text-2xl font-semibold">{activeDays}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Longest streak ever</dt>
                <dd className="font-display text-2xl font-semibold">
                  {bestEver && bestEver.s.longest > 0 ? formatStreak(bestEver.s.longest, bestEver.s.unit) : "—"}
                </dd>
                {bestEver && bestEver.s.longest > 0 && <dd className="truncate text-xs text-muted">{bestEver.h.name}</dd>}
              </div>
              <div>
                <dt className="text-xs text-muted">Reflections written</dt>
                <dd className="font-display text-2xl font-semibold">{journal.length}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <SectionTitle title="Your year in bloom" subtitle="Each square is a day; deeper purple means more habits completed." />
        <div className="mt-5">
          <Heatmap counts={heat} today={today} label="All habits activity" />
        </div>
      </Card>

      <section aria-labelledby="achievements" className="flex flex-col gap-4">
        <SectionTitle
          as="h2"
          title="Achievements"
          subtitle={`${earned.size} of ${catalog.length} unlocked. Once earned, they're yours to keep.`}
        />
        <ul id="achievements" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {catalog.map((a) => {
            const e = earned.get(a.key);
            return (
              <li key={a.key}>
                <Card
                  className={cn(
                    "flex h-full flex-col items-center p-5 text-center transition",
                    e ? "bg-gradient-to-b from-tint/70 to-surface hover:-translate-y-0.5 hover:shadow-lift" : "opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "relative grid size-16 place-items-center rounded-full",
                      e ? "bg-primary text-primary-ink shadow-glow" : "border-2 border-dashed border-line-strong text-muted",
                    )}
                  >
                    <Icon name={a.icon} className="size-7" />
                    {e && e.count > 1 && (
                      <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">
                        ×{e.count}
                      </span>
                    )}
                  </span>
                  <p className="mt-3 text-sm font-semibold">{a.title}</p>
                  <p className="mt-1 text-xs text-muted">{a.description}</p>
                  <p className="mt-2 text-[11px] font-medium text-accent">
                    {e ? `Earned ${formatShort(dateInTimeZone(new Date(e.first), profile.timezone))}` : "Not yet"}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
