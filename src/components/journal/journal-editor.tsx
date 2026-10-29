"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { deleteJournalEntry, saveJournalEntry, type JournalFormState } from "@/lib/actions/journal";
import { MOODS, type JournalEntry } from "@/lib/habits/catalog";
import { formatLong } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function JournalEditor({
  date,
  today,
  entry,
}: {
  date: string;
  today: string;
  entry: JournalEntry | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [state, action, pending] = useActionState<JournalFormState, FormData>(saveJournalEntry, {});
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [reflection, setReflection] = useState(entry?.reflection ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const lastSaved = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.savedAt || state.savedAt === lastSaved.current) return;
    lastSaved.current = state.savedAt;
    toast.success("Entry saved", state.message);
    for (const a of state.achievements ?? []) toast.celebrate(`Achievement unlocked: ${a.title}`, a.description);
  }, [state, toast]);

  const remove = () =>
    startDelete(async () => {
      if (!entry) return;
      const res = await deleteJournalEntry(entry.id);
      setConfirmDelete(false);
      if (!res.ok) return toast.error("Couldn't delete", res.message);
      toast.success("Entry deleted");
      setMood(null);
      setReflection("");
      setNotes("");
      router.refresh();
    });

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <Field label="Date" htmlFor="date" hint={date === today ? "Today" : formatLong(date)}>
        <Input
          id="date"
          name="date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && router.push(`/journal?date=${e.target.value}`, { scroll: false })}
          className="sm:max-w-56"
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-ink">How are you feeling?</legend>
        <div className="mt-2 grid grid-cols-5 gap-2 sm:max-w-md">
          {MOODS.map((m) => {
            const selected = mood === m.value;
            return (
              <label key={m.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="mood"
                  value={m.value}
                  checked={selected}
                  onChange={() => setMood(m.value)}
                  onClick={() => selected && setMood(null)}
                  className="peer sr-only"
                />
                <motion.span
                  whileTap={{ scale: 0.92 }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 transition peer-focus-visible:ring-4 peer-focus-visible:ring-tint",
                    selected ? "border-primary bg-tint" : "border-line-strong hover:border-accent",
                  )}
                >
                  <span className={cn("text-3xl transition", !selected && mood != null && "opacity-50 grayscale-[40%]")} aria-hidden>
                    {m.emoji}
                  </span>
                  <span className={cn("text-xs font-medium", selected ? "text-primary" : "text-muted")}>{m.label}</span>
                </motion.span>
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted">Optional. Tap again to clear.</p>
      </fieldset>

      <Field label="How did today go?" htmlFor="reflection" error={state.errors?.reflection}>
        <Textarea
          id="reflection"
          name="reflection"
          rows={5}
          maxLength={2000}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="A small win, something you noticed, something you'd do differently…"
          aria-invalid={Boolean(state.errors?.reflection)}
        />
      </Field>
      <Field label="Notes" htmlFor="notes" hint="Optional: anything else you want to remember." error={state.errors?.notes}>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={pending}>
          {entry ? "Save changes" : "Save entry"}
        </Button>
        {entry && (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="hover:bg-danger-tint hover:text-danger">
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        )}
        <span className="ml-auto text-xs text-muted">Private: only you can see your journal.</span>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        pending={deleting}
        title="Delete this entry?"
        description={`Your reflection for ${formatLong(date)} will be permanently removed.`}
        confirmLabel="Delete entry"
      />
    </form>
  );
}
