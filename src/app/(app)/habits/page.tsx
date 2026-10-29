import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Flame, LayoutTemplate, Plus } from "lucide-react";
import { getProfile, listCompletions, listHabits } from "@/lib/data";
import { addDays, todayInTimeZone } from "@/lib/dates";
import { categoryLabel, describeSchedule, formatAmount } from "@/lib/habits/catalog";
import { computeStreak, formatStreak } from "@/lib/habits/streaks";
import { habitRate, totalCompletions } from "@/lib/habits/stats";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitActions } from "@/components/habits/habit-actions";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Habits" };

export default async function HabitsPage(props: PageProps<"/habits">) {
  const sp = await props.searchParams;
  const view = sp.view === "archived" ? "archived" : "active";
  const [profile, habits, completions] = await Promise.all([getProfile(), listHabits(), listCompletions()]);
  const today = todayInTimeZone(profile.timezone);
  const active = habits.filter((h) => !h.archivedAt);
  const archived = habits.filter((h) => h.archivedAt);
  const shown = view === "archived" ? archived : active;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your garden"
        title="Habits"
        description="Everything you're growing, in one place."
        action={
          <>
            <ButtonLink href="/templates" variant="secondary">
              <LayoutTemplate className="size-4" aria-hidden /> Templates
            </ButtonLink>
            <ButtonLink href="/habits/new">
              <Plus className="size-4" aria-hidden /> New habit
            </ButtonLink>
          </>
        }
      />

      <div role="tablist" aria-label="Habit list" className="inline-flex self-start rounded-2xl bg-tint p-1">
        {[
          { key: "active", label: `Active (${active.length})`, href: "/habits" },
          { key: "archived", label: `Archived (${archived.length})`, href: "/habits?view=archived" },
        ].map((t) => (
          <Link
            key={t.key}
            role="tab"
            aria-selected={view === t.key}
            href={t.href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              view === t.key ? "bg-surface text-primary shadow-soft" : "text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-tint text-primary">
            {view === "archived" ? <Archive className="size-6" aria-hidden /> : <Plus className="size-6" aria-hidden />}
          </span>
          <h2 className="font-display text-xl font-semibold">
            {view === "archived" ? "Nothing archived" : "No habits yet"}
          </h2>
          <p className="max-w-sm text-sm text-muted">
            {view === "archived"
              ? "When you archive a habit, it rests here with its history intact until you bring it back."
              : "Start with a template or create your own. Small and specific works best."}
          </p>
          {view === "active" && (
            <ButtonLink href="/templates" className="mt-2">
              Browse templates
            </ButtonLink>
          )}
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((h) => {
            const streak = computeStreak(h, completions, today);
            const rate = habitRate(h, completions, addDays(today, -29), today, today).rate;
            const total = totalCompletions(h, completions);
            return (
              <li key={h.id}>
                <Card className={cn("flex h-full flex-col p-5 transition hover:shadow-lift", h.archivedAt && "opacity-80")}>
                  <div className="flex items-start gap-4">
                    <HabitIcon icon={h.icon} color={h.color} size="lg" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/habits/${h.id}`} className="font-display text-lg font-semibold hover:text-primary">
                        {h.name}
                      </Link>
                      <p className="text-sm text-muted">{describeSchedule(h)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge>{categoryLabel(h.category)}</Badge>
                        {h.targetValue != null && <Badge>{formatAmount(h.targetValue, h.unit)}</Badge>}
                        {h.reminderTime && <Badge>⏰ {h.reminderTime}</Badge>}
                      </div>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-surface-muted p-3 text-center">
                    <div>
                      <dt className="text-xs text-muted">Streak</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold">
                        {streak.current > 0 && <Flame className="size-3.5" style={{ color: "#e0703f" }} aria-hidden />}
                        {formatStreak(streak.current, streak.unit)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Last 30 days</dt>
                      <dd className="mt-0.5 font-semibold">{rate == null ? "—" : `${Math.round(rate * 100)}%`}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Total</dt>
                      <dd className="mt-0.5 font-semibold">{total}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Link href={`/habits/${h.id}`} className="text-sm font-semibold text-primary hover:underline">
                      View history
                    </Link>
                    <HabitActions id={h.id} name={h.name} archived={Boolean(h.archivedAt)} compact />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
