"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Bell, Minus, Plus, Target } from "lucide-react";
import type { HabitFormState } from "@/lib/actions/habits";
import { CATEGORIES, COLORS, ICONS, describeSchedule, type Habit } from "@/lib/habits/catalog";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/dates";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert, Card, Field, FieldError, Input, Textarea } from "@/components/ui/primitives";
import { HabitIcon, Icon } from "@/components/habits/habit-icon";
import { cn } from "@/lib/cn";

export type HabitDraft = Pick<
  Habit,
  "name" | "description" | "icon" | "color" | "category" | "scheduleDays" | "weeklyGoal" | "targetValue" | "unit" | "reminderTime"
>;

export const EMPTY_DRAFT: HabitDraft = {
  name: "",
  description: "",
  icon: "Sprout",
  color: "violet",
  category: "personal",
  scheduleDays: [0, 1, 2, 3, 4, 5, 6],
  weeklyGoal: 7,
  targetValue: null,
  unit: null,
  reminderTime: null,
};

const PRESETS = [
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
];

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

export function HabitForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: HabitFormState, formData: FormData) => Promise<HabitFormState>;
  initial: HabitDraft;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [category, setCategory] = useState<string>(initial.category);
  const [targetValue, setTargetValue] = useState(initial.targetValue != null ? String(initial.targetValue) : "");
  const [unit, setUnit] = useState(initial.unit ?? "");
  const [reminderTime, setReminderTime] = useState(initial.reminderTime ?? "08:00");
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);
  const [days, setDays] = useState<number[]>(initial.scheduleDays);
  const [goal, setGoal] = useState(Math.min(initial.weeklyGoal, initial.scheduleDays.length));
  const [hasTarget, setHasTarget] = useState(initial.targetValue != null);
  const [hasReminder, setHasReminder] = useState(initial.reminderTime != null);
  const errors = state.errors ?? {};

  const setSchedule = (next: number[]) => {
    if (next.length === 0) return;
    // Keep "every scheduled day" if that's what they had; otherwise clamp.
    setGoal((g) => (g >= days.length ? next.length : Math.min(g, next.length)));
    setDays(next);
  };
  const toggleDay = (d: number) => setSchedule(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  const custom = !PRESETS.some((p) => sameDays(p.days, days));

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="flex flex-col gap-6">
        {state.message && <Alert tone="error">{state.message}</Alert>}

        <Card className="flex flex-col gap-5 p-6">
          <Field label="Habit name" htmlFor="name" error={errors.name}>
            <Input
              id="name"
              name="name"
              required
              maxLength={60}
              placeholder="e.g. Read before bed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              autoFocus={!initial.name}
            />
          </Field>
          <Field label="Description" htmlFor="description" hint="Optional: a note to your future self." error={errors.description}>
            <Textarea
              id="description"
              name="description"
              maxLength={280}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why does this matter to you?"
            />
          </Field>

          <fieldset>
            <legend className="text-sm font-medium text-ink">Category</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label key={c.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={category === c.value}
                    onChange={() => setCategory(c.value)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink-soft transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-ink peer-focus-visible:ring-4 peer-focus-visible:ring-tint hover:border-accent">
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
            <FieldError>{errors.category}</FieldError>
          </fieldset>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Icon</legend>
            <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
              {ICONS.map((name) => (
                <label key={name} className="cursor-pointer" title={name}>
                  <input
                    type="radio"
                    name="icon"
                    value={name}
                    checked={icon === name}
                    onChange={() => setIcon(name)}
                    className="peer sr-only"
                    aria-label={name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  />
                  <span className="grid aspect-square place-items-center rounded-xl border border-transparent text-ink-soft transition hover:bg-tint peer-checked:border-primary peer-checked:bg-tint peer-checked:text-primary peer-focus-visible:ring-4 peer-focus-visible:ring-tint">
                    <Icon name={name} className="size-5" />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium text-ink">Colour</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <label key={c.value} className="cursor-pointer" title={c.label}>
                  <input
                    type="radio"
                    name="color"
                    value={c.value}
                    checked={color === c.value}
                    onChange={() => setColor(c.value)}
                    className="peer sr-only"
                    aria-label={c.label}
                  />
                  <span
                    className="block size-9 rounded-full ring-offset-2 ring-offset-surface transition peer-checked:ring-2 peer-focus-visible:ring-2 hover:scale-110"
                    style={{ backgroundColor: c.hex, ["--tw-ring-color" as string]: c.hex }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Which days?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = sameDays(p.days, days);
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setSchedule(p.days)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition",
                      active ? "border-primary bg-tint font-medium text-primary" : "border-line-strong text-ink-soft hover:border-accent",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
              <span
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm",
                  custom ? "border-primary bg-tint font-medium text-primary" : "border-transparent text-muted",
                )}
              >
                Custom
              </span>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1.5 sm:max-w-md">
              {WEEKDAY_ORDER.map((d) => (
                <label key={d} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="scheduleDays"
                    value={d}
                    checked={days.includes(d)}
                    onChange={() => toggleDay(d)}
                    className="peer sr-only"
                    aria-label={WEEKDAY_NAMES[d]}
                  />
                  <span className="grid h-11 place-items-center rounded-xl border border-line-strong text-sm font-medium text-ink-soft transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-ink peer-focus-visible:ring-4 peer-focus-visible:ring-tint hover:border-accent">
                    {WEEKDAY_LABELS[d]}
                  </span>
                </label>
              ))}
            </div>
            <FieldError>{errors.scheduleDays}</FieldError>
          </fieldset>

          <div>
            <p className="text-sm font-medium text-ink" id="goal-label">
              Weekly goal
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-2xl border border-line-strong bg-surface">
                <button
                  type="button"
                  onClick={() => setGoal((g) => Math.max(1, g - 1))}
                  disabled={goal <= 1}
                  className="grid size-11 place-items-center rounded-l-2xl text-ink-soft hover:bg-tint disabled:opacity-40"
                  aria-label="Fewer times per week"
                >
                  <Minus className="size-4" />
                </button>
                <output aria-labelledby="goal-label" className="w-10 text-center font-semibold tabular-nums">
                  {goal}
                </output>
                <button
                  type="button"
                  onClick={() => setGoal((g) => Math.min(days.length, g + 1))}
                  disabled={goal >= days.length}
                  className="grid size-11 place-items-center rounded-r-2xl text-ink-soft hover:bg-tint disabled:opacity-40"
                  aria-label="More times per week"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <span className="text-sm text-ink-soft">
                {goal >= days.length
                  ? "times a week, on every day you picked"
                  : `times a week, on any of the ${days.length} days you picked`}
              </span>
            </div>
            <input type="hidden" name="weeklyGoal" value={goal} />
            <p className="mt-2 text-xs text-muted">
              {goal >= days.length
                ? "Streaks count each scheduled day in a row."
                : "Flexible: skipping a day is fine. Streaks count weeks where you hit your goal."}
            </p>
            <FieldError>{errors.weeklyGoal}</FieldError>
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <div>
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-tint text-primary">
                  <Target className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">Measurable target</span>
                  <span className="block text-xs text-muted">Like 20 pages, 2 litres or 30 minutes.</span>
                </span>
              </span>
              <Toggle name="hasTarget" checked={hasTarget} onChange={setHasTarget} />
            </label>
            {hasTarget && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
                <Field label="Amount" htmlFor="targetValue" error={errors.targetValue}>
                  <Input
                    id="targetValue"
                    name="targetValue"
                    type="number"
                    inputMode="decimal"
                    min="0.25"
                    step="any"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    aria-invalid={Boolean(errors.targetValue)}
                  />
                </Field>
                <Field label="Unit" htmlFor="unit" error={errors.unit}>
                  <Input
                    id="unit"
                    name="unit"
                    maxLength={20}
                    placeholder="pages"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    aria-invalid={Boolean(errors.unit)}
                  />
                </Field>
              </div>
            )}
          </div>
          <div className="h-px bg-line" />
          <div>
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-tint text-primary">
                  <Bell className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">Reminder</span>
                  <span className="block text-xs text-muted">
                    A gentle nudge while Bloomly is open. Turn on reminders in{" "}
                    <Link href="/settings#reminders" className="text-primary underline-offset-2 hover:underline">
                      Settings
                    </Link>
                    .
                  </span>
                </span>
              </span>
              <Toggle name="hasReminder" checked={hasReminder} onChange={setHasReminder} />
            </label>
            {hasReminder && (
              <div className="mt-4 sm:max-w-44">
                <Field label="Time" htmlFor="reminderTime" error={errors.reminderTime}>
                  <Input
                    id="reminderTime"
                    name="reminderTime"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    aria-invalid={Boolean(errors.reminderTime)}
                  />
                </Field>
              </div>
            )}
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Preview</p>
          <div className="mt-4 flex items-center gap-3">
            <HabitIcon icon={icon} color={color} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">{name.trim() || "Your new habit"}</p>
              <p className="text-sm text-muted">{describeSchedule({ scheduleDays: days, weeklyGoal: goal })}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button type="submit" size="lg" loading={pending}>
              {submitLabel}
            </Button>
            <Link href={cancelHref} className={buttonClasses({ variant: "ghost", size: "lg" })}>
              Cancel
            </Link>
          </div>
        </Card>
      </aside>
    </form>
  );
}

function Toggle({ name, checked, onChange }: { name: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        role="switch"
      />
      <span className="h-7 w-12 rounded-full bg-line-strong transition peer-checked:bg-primary peer-focus-visible:ring-4 peer-focus-visible:ring-tint" />
      <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  );
}
