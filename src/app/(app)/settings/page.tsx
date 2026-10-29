import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Download, FileJson, FileSpreadsheet, KeyRound, Palette, ShieldAlert, UserRound } from "lucide-react";
import { getProfile, listActiveHabits } from "@/lib/data";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { DeleteAccountForm, ProfileForm, ReminderSettings, ThemePicker } from "@/components/settings/settings-forms";
import { HabitIcon } from "@/components/habits/habit-icon";
import { buttonClasses } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Settings" };

function Section({
  id,
  icon: IconC,
  title,
  description,
  children,
  tone,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <Card id={id} className={tone === "danger" ? "scroll-mt-24 border-danger/30 p-6" : "scroll-mt-24 p-6"}>
      <div className="flex items-start gap-3">
        <span
          className={
            tone === "danger"
              ? "grid size-10 shrink-0 place-items-center rounded-xl bg-danger-tint text-danger"
              : "grid size-10 shrink-0 place-items-center rounded-xl bg-tint text-primary"
          }
        >
          <IconC className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </Card>
  );
}

export default async function SettingsPage() {
  const [profile, habits] = await Promise.all([getProfile(), listActiveHabits()]);
  const withReminders = habits.filter((h) => h.reminderTime).sort((a, b) => a.reminderTime!.localeCompare(b.reminderTime!));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Settings" title="Make Bloomly yours" description="Profile, reminders, appearance and your data." />

      <nav aria-label="Settings sections" className="-mt-2 flex flex-wrap gap-2 text-sm">
        {[
          ["#profile", "Profile"],
          ["#reminders", "Reminders"],
          ["#appearance", "Appearance"],
          ["#data", "Your data"],
          ["#account", "Account"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full bg-tint px-3 py-1 font-medium text-primary hover:bg-tint-strong">
            {label}
          </a>
        ))}
      </nav>

      <Section id="profile" icon={UserRound} title="Profile">
        <ProfileForm displayName={profile.displayName} timezone={profile.timezone} />
      </Section>

      <Section id="reminders" icon={Bell} title="Reminders" description="Gentle nudges, never nagging.">
        <ReminderSettings enabled={profile.remindersEnabled} />
        <div className="mt-5">
          <p className="text-sm font-semibold">Habits with a reminder time</p>
          {withReminders.length === 0 ? (
            <p className="mt-1 text-sm text-muted">
              None yet. Add a reminder time when you{" "}
              <Link href="/habits" className="font-medium text-primary hover:underline">
                edit a habit
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {withReminders.map((h) => (
                <li key={h.id} className="flex items-center gap-3 py-2.5">
                  <HabitIcon icon={h.icon} color={h.color} size="sm" />
                  <span className="flex-1 text-sm font-medium">{h.name}</span>
                  <span className="text-sm tabular-nums text-ink-soft">{h.reminderTime}</span>
                  <Link href={`/habits/${h.id}/edit`} className="text-sm font-medium text-primary hover:underline">
                    Change
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section id="appearance" icon={Palette} title="Appearance">
        <ThemePicker saved={profile.theme} />
      </Section>

      <Section id="data" icon={Download} title="Your data" description="Download everything Bloomly stores about you, any time.">
        <div className="flex flex-wrap gap-3">
          <a href="/api/export?format=json" className={buttonClasses({ variant: "secondary" })} download>
            <FileJson className="size-4" aria-hidden /> Everything (JSON)
          </a>
          <a href="/api/export?format=csv&type=completions" className={buttonClasses({ variant: "secondary" })} download>
            <FileSpreadsheet className="size-4" aria-hidden /> Habit history (CSV)
          </a>
          <a href="/api/export?format=csv&type=journal" className={buttonClasses({ variant: "secondary" })} download>
            <FileSpreadsheet className="size-4" aria-hidden /> Journal (CSV)
          </a>
        </div>
        <p className="mt-3 text-xs text-muted">
          Your data is private to your account and protected by row-level security in the database.
        </p>
      </Section>

      <Section id="account" icon={KeyRound} title="Account" description={`Signed in as ${profile.email}`}>
        <h3 className="text-sm font-semibold">Change password</h3>
        <div className="mt-3 max-w-md">
          <NewPasswordForm context="settings" />
        </div>
      </Section>

      <Section
        id="delete"
        icon={ShieldAlert}
        title="Delete account"
        tone="danger"
        description="Permanently deletes your account, habits, check-ins, journal and achievements. This can't be undone. You may want to export your data first."
      >
        <DeleteAccountForm />
      </Section>
    </div>
  );
}
