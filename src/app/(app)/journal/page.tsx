import type { Metadata } from "next";
import Link from "next/link";
import { Lock, NotebookPen } from "lucide-react";
import { getProfile, listJournalEntries } from "@/lib/data";
import { addDays, formatLong, isISODate, todayInTimeZone } from "@/lib/dates";
import { MOODS, moodFor } from "@/lib/habits/catalog";
import { JournalEditor } from "@/components/journal/journal-editor";
import { Card, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage(props: PageProps<"/journal">) {
  const sp = await props.searchParams;
  const [profile, entries] = await Promise.all([getProfile(), listJournalEntries()]);
  const today = todayInTimeZone(profile.timezone);
  const requested = typeof sp.date === "string" && isISODate(sp.date) ? sp.date : today;
  const date = requested > today ? today : requested;
  const entry = entries.find((e) => e.date === date) ?? null;

  const recent = entries.filter((e) => e.date >= addDays(today, -29) && e.mood != null);
  const moodCounts = MOODS.map((m) => ({ ...m, count: recent.filter((e) => e.mood === m.value).length }));
  const maxMood = Math.max(1, ...moodCounts.map((m) => m.count));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Journal"
        title="A moment to reflect"
        description="A few honest words a day is plenty. There's no wrong way to do this."
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <SectionTitle
            title={date === today ? "Today's entry" : formatLong(date)}
            subtitle={entry ? "You've written for this day. Edit it any time." : "Nothing written for this day yet."}
          />
          <div className="mt-5">
            <JournalEditor key={date} date={date} today={today} entry={entry} />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <SectionTitle title="Mood, last 30 days" subtitle={`${recent.length} day${recent.length === 1 ? "" : "s"} with a mood logged`} />
            {recent.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Log a mood with your entries to see how your days feel over time.</p>
            ) : (
              <ul className="mt-4 flex items-end justify-between gap-2" aria-label="Mood counts">
                {moodCounts.map((m) => (
                  <li key={m.value} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-xs font-semibold tabular-nums text-ink-soft">{m.count}</span>
                    <span className="flex h-20 w-full items-end overflow-hidden rounded-xl bg-tint">
                      <span
                        className="w-full rounded-xl bg-accent"
                        style={{ height: `${(m.count / maxMood) * 100}%` }}
                        aria-hidden
                      />
                    </span>
                    <span className="text-xl" aria-hidden>
                      {m.emoji}
                    </span>
                    <span className="sr-only">
                      {m.label}: {m.count} days
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex-1 p-6">
            <SectionTitle title="Past entries" subtitle={`${entries.length} in total`} />
            {entries.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 text-center">
                <NotebookPen className="size-8 text-accent" aria-hidden />
                <p className="text-sm text-muted">Your entries will collect here, like pressed flowers in a book.</p>
              </div>
            ) : (
              <ul className="mt-4 flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
                {entries.map((e) => {
                  const m = moodFor(e.mood);
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/journal?date=${e.date}`}
                        scroll={false}
                        aria-current={e.date === date ? "true" : undefined}
                        className={cn(
                          "flex gap-3 rounded-2xl border px-3 py-2.5 transition",
                          e.date === date ? "border-primary bg-tint" : "border-transparent hover:bg-surface-muted",
                        )}
                      >
                        <span className="text-2xl" aria-hidden>
                          {m?.emoji ?? "📝"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {e.date === today ? "Today" : formatLong(e.date)}
                            {m && <span className="sr-only">, feeling {m.label}</span>}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {e.reflection || e.notes || (m ? `Feeling ${m.label.toLowerCase()}` : "")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <Lock className="size-3.5" aria-hidden /> Your journal is private to your account.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
