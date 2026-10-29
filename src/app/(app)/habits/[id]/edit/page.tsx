import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateHabit } from "@/lib/actions/habits";
import { getHabit } from "@/lib/data";
import { HabitForm } from "@/components/habits/habit-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Edit habit" };

export default async function EditHabitPage(props: PageProps<"/habits/[id]/edit">) {
  const { id } = await props.params;
  const habit = await getHabit(id);
  if (!habit) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Edit habit"
        title={habit.name}
        description="Changes apply from now on. Your history stays exactly as it is."
      />
      <HabitForm
        action={updateHabit.bind(null, habit.id)}
        initial={habit}
        submitLabel="Save changes"
        cancelHref={`/habits/${habit.id}`}
      />
    </div>
  );
}
