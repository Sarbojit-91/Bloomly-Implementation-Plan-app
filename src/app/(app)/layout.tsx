import { AppNav } from "@/components/app/app-nav";
import { ReminderManager, ThemeSync, type ReminderItem } from "@/components/app/reminders";
import { LocalModeBanner } from "@/components/app/local-mode-banner";
import { getProfile, listActiveHabits, listCompletions, requireUser } from "@/lib/data";
import { isLocalMode } from "@/lib/backend";
import { todayInTimeZone } from "@/lib/dates";
import { buildDoneSet, isDueToday } from "@/lib/habits/model";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [profile, habits, completions] = await Promise.all([getProfile(), listActiveHabits(), listCompletions()]);
  const today = todayInTimeZone(profile.timezone);

  const reminders: ReminderItem[] = habits
    .filter((h) => h.reminderTime)
    .map((h) => {
      const done = buildDoneSet(h, completions);
      return { h, done };
    })
    .filter(({ h, done }) => isDueToday(h, today, done))
    .map(({ h, done }) => ({ id: h.id, name: h.name, time: h.reminderTime!, done: done.has(today) }));

  return (
    <div className="flex min-h-dvh flex-col">
      {isLocalMode && <LocalModeBanner />}
      <AppNav displayName={profile.displayName} email={profile.email} />
      <ThemeSync theme={profile.theme} />
      <ReminderManager enabled={profile.remindersEnabled} timezone={profile.timezone} items={reminders} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        {children}
      </main>
      <footer className="border-t border-line/70 py-6 text-center text-xs text-muted">
        Bloomly · Grow at your own pace 🌸
      </footer>
    </div>
  );
}
