"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { BellOff, BellRing, Check, Laptop, LocateFixed, Moon, Sun } from "lucide-react";
import {
  deleteAccount,
  updateProfile,
  updateReminders,
  updateTheme,
  type SettingsFormState,
} from "@/lib/actions/settings";
import { notificationSupport } from "@/components/app/reminders";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function ProfileForm({ displayName, timezone }: { displayName: string; timezone: string }) {
  const toast = useToast();
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(updateProfile, {});
  const [name, setName] = useState(displayName);
  const [tz, setTz] = useState(timezone);
  const zones = useMemo(() => {
    let list: string[] = [];
    try {
      list = Intl.supportedValuesOf("timeZone");
    } catch {
      list = [];
    }
    return list.includes(timezone) ? list : [timezone, ...list];
  }, [timezone]);
  const shown = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.savedAt && state.savedAt !== shown.current) {
      shown.current = state.savedAt;
      toast.success("Profile saved");
    }
  }, [state, toast]);

  const detect = () => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local) setTz(local);
  };

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}
      <Field label="Display name" htmlFor="displayName" error={state.errors?.displayName}>
        <Input
          id="displayName"
          name="displayName"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(state.errors?.displayName)}
          className="sm:max-w-sm"
        />
      </Field>
      <Field
        label="Timezone"
        htmlFor="timezone"
        hint="Decides when your day starts and ends. Past check-ins always stay on the dates you logged them."
        error={state.errors?.timezone}
      >
        <div className="flex flex-wrap gap-2">
          <Select id="timezone" name="timezone" value={tz} onChange={(e) => setTz(e.target.value)} className="sm:max-w-sm">
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" onClick={detect}>
            <LocateFixed className="size-4" aria-hidden /> Use this device&apos;s
          </Button>
        </div>
      </Field>
      <Button type="submit" loading={pending} className="self-start">
        Save profile
      </Button>
    </form>
  );
}

const THEMES = [
  { value: "light", label: "Light", icon: Sun, hint: "White & purple (default)" },
  { value: "dark", label: "Dark", icon: Moon, hint: "Deep plum, easy on the eyes" },
  { value: "system", label: "System", icon: Laptop, hint: "Follow your device" },
] as const;

export function ThemePicker({ saved }: { saved: "light" | "dark" | "system" }) {
  const { setTheme } = useTheme();
  const toast = useToast();
  const [current, setCurrent] = useState(saved);
  const [, startTransition] = useTransition();

  const choose = (value: (typeof THEMES)[number]["value"]) => {
    setCurrent(value);
    setTheme(value);
    try {
      sessionStorage.setItem("bloomly:theme-synced", value);
    } catch {
      // ignore
    }
    startTransition(async () => {
      const res = await updateTheme(value);
      if (!res.ok) toast.error("Couldn't save your theme", "It's applied on this device for now.");
    });
  };

  return (
    <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
      {THEMES.map((t) => {
        const active = current === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(t.value)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
              active ? "border-primary bg-tint" : "border-line-strong hover:border-accent",
            )}
          >
            <span className={cn("grid size-10 place-items-center rounded-xl", active ? "bg-primary text-primary-ink" : "bg-tint text-primary")}>
              <t.icon className="size-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="block text-xs text-muted">{t.hint}</span>
            </span>
            {active && <Check className="size-4 text-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

export function ReminderSettings({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const [on, setOn] = useState(enabled);
  const [permission, setPermission] = useState<"unsupported" | NotificationPermission | "unknown">("unknown");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- permission is only readable in the browser
    setPermission(notificationSupport());
  }, []);

  const save = (next: boolean) =>
    startTransition(async () => {
      setOn(next);
      const res = await updateReminders(next);
      if (!res.ok) {
        setOn(!next);
        toast.error("Couldn't update reminders", "Please try again.");
      } else {
        toast.success(next ? "Reminders on" : "Reminders off");
      }
    });

  const askPermission = async () => {
    if (notificationSupport() === "unsupported") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("Notifications allowed", "We'll nudge you at your reminder times while Bloomly is open.");
      if (!on) save(true);
    } else if (result === "denied") {
      toast.info("Notifications blocked", "No problem: reminders will show as banners inside Bloomly instead.");
    }
  };

  const sendTest = () => {
    try {
      new Notification("Bloomly test reminder 🌸", { body: "This is how your reminders will look.", icon: "/icon.svg" });
    } catch {
      toast.info("Your browser shows notifications only from installed apps", "You'll still get in-app reminder banners.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface-muted p-4">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-tint text-primary">
            {on ? <BellRing className="size-5" aria-hidden /> : <BellOff className="size-5" aria-hidden />}
          </span>
          <span>
            <span className="block text-sm font-semibold">Habit reminders</span>
            <span className="block text-xs text-muted">At each habit&apos;s reminder time, if it isn&apos;t done yet.</span>
          </span>
        </span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            role="switch"
            checked={on}
            disabled={pending}
            onChange={(e) => save(e.target.checked)}
            className="peer sr-only"
          />
          <span className="h-7 w-12 rounded-full bg-line-strong transition peer-checked:bg-primary peer-focus-visible:ring-4 peer-focus-visible:ring-tint" />
          <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>

      <div className="rounded-2xl border border-line p-4 text-sm">
        <p className="font-semibold">Browser notifications</p>
        {permission === "unsupported" && (
          <p className="mt-1 text-ink-soft">
            This browser doesn&apos;t support notifications. Reminders will appear as banners at the top of Bloomly instead.
          </p>
        )}
        {permission === "default" && (
          <>
            <p className="mt-1 text-ink-soft">Allow notifications to get a nudge even when Bloomly is in a background tab.</p>
            <Button size="sm" variant="soft" className="mt-3" onClick={askPermission}>
              Allow notifications
            </Button>
          </>
        )}
        {permission === "granted" && (
          <>
            <p className="mt-1 text-success">Allowed. You&apos;ll get a notification at each reminder time.</p>
            <Button size="sm" variant="soft" className="mt-3" onClick={sendTest}>
              Send a test notification
            </Button>
          </>
        )}
        {permission === "denied" && (
          <p className="mt-1 text-ink-soft">
            Notifications are blocked for this site. Reminders will appear as in-app banners instead. To change this, update
            the site permissions in your browser settings.
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          Good to know: reminders work while Bloomly is open in a browser tab (it can be in the background). Bloomly doesn&apos;t
          send emails or push notifications when it&apos;s closed.
        </p>
      </div>
    </div>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(deleteAccount, {});
  const [confirm, setConfirm] = useState("");
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field
        label={
          <>
            Type <strong>DELETE</strong> to confirm
          </>
        }
        htmlFor="confirm"
        error={state.errors?.confirm}
      >
        <Input
          id="confirm"
          name="confirm"
          autoComplete="off"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="sm:max-w-xs"
          aria-invalid={Boolean(state.errors?.confirm)}
        />
      </Field>
      <Button type="submit" variant="danger" loading={pending} disabled={confirm.trim() !== "DELETE"} className="self-start">
        Delete my account and data
      </Button>
    </form>
  );
}
