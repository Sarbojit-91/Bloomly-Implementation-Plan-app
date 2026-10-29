"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { archiveHabit, deleteHabit, restoreHabit } from "@/lib/actions/habits";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Edit / archive / restore / delete controls for one habit. */
export function HabitActions({
  id,
  name,
  archived,
  compact = false,
  afterDelete,
}: {
  id: string;
  name: string;
  archived: boolean;
  compact?: boolean;
  /** Where to go after deleting (detail pages navigate away). */
  afterDelete?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"delete" | "archive" | null>(null);

  const run = (kind: "archive" | "restore" | "delete") =>
    startTransition(async () => {
      const fn = kind === "archive" ? archiveHabit : kind === "restore" ? restoreHabit : deleteHabit;
      const res = await fn(id);
      setConfirm(null);
      if (!res.ok) {
        toast.error("Something went wrong", res.message);
        return;
      }
      if (kind === "archive") toast.success(`“${name}” archived`, "Its history is kept safe. Restore it any time.");
      if (kind === "restore") toast.success(`“${name}” is back in your garden`);
      if (kind === "delete") {
        toast.success(`“${name}” deleted`);
        if (afterDelete) router.push(afterDelete);
      }
    });

  const btn = (extra?: string) => buttonClasses({ variant: "ghost", size: compact ? "icon" : "sm", className: extra });

  return (
    <div className="flex items-center gap-1">
      {!archived && (
        <Link href={`/habits/${id}/edit`} className={btn()} aria-label={`Edit ${name}`}>
          <Pencil className="size-4" aria-hidden />
          {!compact && "Edit"}
        </Link>
      )}
      {archived ? (
        <button type="button" onClick={() => run("restore")} disabled={pending} className={btn()} aria-label={`Restore ${name}`}>
          <ArchiveRestore className="size-4" aria-hidden />
          {!compact && "Restore"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm("archive")}
          disabled={pending}
          className={btn()}
          aria-label={`Archive ${name}`}
        >
          <Archive className="size-4" aria-hidden />
          {!compact && "Archive"}
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirm("delete")}
        disabled={pending}
        className={cn(btn(), "hover:bg-danger-tint hover:text-danger")}
        aria-label={`Delete ${name}`}
      >
        <Trash2 className="size-4" aria-hidden />
        {!compact && "Delete"}
      </button>

      <ConfirmDialog
        open={confirm === "archive"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("archive")}
        pending={pending}
        tone="primary"
        title={`Archive “${name}”?`}
        description="It will leave your daily list, but all its history stays. You can restore it whenever you like."
        confirmLabel="Archive"
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("delete")}
        pending={pending}
        title={`Delete “${name}” for good?`}
        description="This permanently removes the habit and all of its completion history. If you might come back to it, archive it instead."
        confirmLabel="Delete forever"
      />
    </div>
  );
}
