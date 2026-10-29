"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, X } from "lucide-react";
import { useTheme } from "next-themes";
import { timeInTimeZone, todayInTimeZone } from "@/lib/dates";

export interface ReminderItem {
  id: string;
  name: string;
  time: string; // "HH:MM" in the user's timezone
  done: boolean;
}

const CHECK_EVERY_MS = 20_000;
/** OS notifications only fire close to the reminder time; older ones show in-app only. */
const NOTIFY_WINDOW_MIN = 30;

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode); reminders still work in-memory.
  }
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function notificationSupport(): "unsupported" | NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Reminders while Bloomly is open in a tab. When a habit's reminder time
 * passes and it isn't done yet, we show a gentle in-app banner and, if the
 * user allowed it, a browser notification. Each reminder fires once per day.
 */
export function ReminderManager({
  enabled,
  timezone,
  items,
}: {
  enabled: boolean;
  timezone: string;
  items: ReminderItem[];
}) {
  const [due, setDue] = useState<ReminderItem[]>([]);
  const router = useRouter();

  const check = useCallback(() => {
    const today = todayInTimeZone(timezone);
    const now = minutes(timeInTimeZone(timezone));
    const pending = items.filter((i) => !i.done && minutes(i.time) <= now);
    const visible = pending.filter((i) => storageGet(`bloomly:dismissed:${today}:${i.id}`) !== "1");
    setDue(visible);

    for (const item of pending) {
      const key = `bloomly:notified:${today}:${item.id}`;
      if (storageGet(key)) continue;
      storageSet(key, "1");
      if (now - minutes(item.time) > NOTIFY_WINDOW_MIN) continue;
      if (notificationSupport() !== "granted") continue;
      try {
        const n = new Notification(`Time for “${item.name}”`, {
          body: "A gentle nudge from Bloomly. You've got this!",
          icon: "/icon.svg",
          tag: `bloomly-${item.id}-${today}`,
        });
        n.onclick = () => {
          window.focus();
          router.push("/today");
        };
      } catch {
        // Some browsers (e.g. Android Chrome) only allow notifications from a
        // service worker; the in-app banner still covers those.
      }
    }
  }, [items, timezone, router]);

  useEffect(() => {
    if (!enabled || items.length === 0) return;
    const first = setTimeout(check, 0);
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, items, check]);

  const dismiss = (id: string) => {
    storageSet(`bloomly:dismissed:${todayInTimeZone(timezone)}:${id}`, "1");
    setDue((d) => d.filter((i) => i.id !== id));
  };

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6" aria-live="polite">
      <AnimatePresence initial={false}>
        {due.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-tint-strong bg-tint px-4 py-3 text-sm">
              <BellRing className="size-4 shrink-0 text-primary" aria-hidden />
              <p className="flex-1 text-ink">
                Reminder: <strong>{item.name}</strong> was planned for {item.time}.{" "}
                <Link href="/today" className="font-semibold text-primary underline-offset-2 hover:underline">
                  Check it off on Today
                </Link>
              </p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-lg p-1 text-muted hover:bg-tint-strong hover:text-ink"
                aria-label={`Dismiss reminder for ${item.name}`}
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Applies the theme saved in the user's profile once per browser session. */
export function ThemeSync({ theme }: { theme: "light" | "dark" | "system" }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    let applied: string | null = null;
    try {
      applied = sessionStorage.getItem("bloomly:theme-synced");
    } catch {
      // ignore
    }
    if (applied === theme) return;
    setTheme(theme);
    try {
      sessionStorage.setItem("bloomly:theme-synced", theme);
    } catch {
      // ignore
    }
  }, [theme, setTheme]);
  return null;
}
