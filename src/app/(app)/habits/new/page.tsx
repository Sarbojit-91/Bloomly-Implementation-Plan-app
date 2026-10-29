import type { Metadata } from "next";
import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { createHabit } from "@/lib/actions/habits";
import { findTemplate } from "@/lib/habits/templates";
import { EMPTY_DRAFT, HabitForm, type HabitDraft } from "@/components/habits/habit-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "New habit" };

export default async function NewHabitPage(props: PageProps<"/habits/new">) {
  const sp = await props.searchParams;
  const template = findTemplate(typeof sp.template === "string" ? sp.template : null);
  const initial: HabitDraft = template
    ? {
        name: template.name,
        description: template.description,
        icon: template.icon,
        color: template.color,
        category: template.category,
        scheduleDays: template.scheduleDays,
        weeklyGoal: template.weeklyGoal,
        targetValue: template.targetValue,
        unit: template.unit,
        reminderTime: null,
      }
    : EMPTY_DRAFT;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={template ? "From a template" : "New habit"}
        title={template ? `Make “${template.name}” yours` : "Plant a new habit"}
        description={
          template
            ? "Everything here is a suggestion. Adjust the name, days or target to fit your life."
            : "Keep it small and specific. You can change anything later."
        }
        action={
          !template && (
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-primary hover:bg-tint"
            >
              <LayoutTemplate className="size-4" aria-hidden /> Start from a template
            </Link>
          )
        }
      />
      <HabitForm
        key={template?.slug ?? "blank"}
        action={createHabit}
        initial={initial}
        submitLabel="Add habit"
        cancelHref={template ? "/templates" : "/habits"}
      />
    </div>
  );
}
