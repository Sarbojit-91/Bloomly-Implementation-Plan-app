import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { TEMPLATES } from "@/lib/habits/templates";
import { CATEGORIES, describeSchedule, formatAmount } from "@/lib/habits/catalog";
import { listHabits } from "@/lib/data";
import { HabitIcon } from "@/components/habits/habit-icon";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const habits = await listHabits();
  const existing = new Set(habits.map((h) => h.name.trim().toLowerCase()));
  const groups = CATEGORIES.map((c) => ({ ...c, items: TEMPLATES.filter((t) => t.category === c.value) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Templates"
        title="Find a habit to grow"
        description="Pick a starting point, tweak it to fit your life, and add it to your garden."
        action={
          <ButtonLink href="/habits/new" variant="secondary">
            <Plus className="size-4" aria-hidden /> Start from scratch
          </ButtonLink>
        }
      />
      {groups.map((g) => (
        <section key={g.value} aria-labelledby={`cat-${g.value}`} className="flex flex-col gap-4">
          <h2 id={`cat-${g.value}`} className="font-display text-xl font-semibold">
            {g.label}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((t) => {
              const added = existing.has(t.name.toLowerCase());
              return (
                <li key={t.slug}>
                  <Card className="group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex items-start gap-3">
                      <HabitIcon icon={t.icon} color={t.color} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold leading-snug">{t.name}</h3>
                        <p className="mt-0.5 text-sm text-muted">{t.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge>{describeSchedule(t)}</Badge>
                      {t.targetValue != null && <Badge>{formatAmount(t.targetValue, t.unit)}</Badge>}
                    </div>
                    <p className="mt-3 flex-1 text-sm text-ink-soft">{t.tip}</p>
                    <div className="mt-4 flex items-center justify-between">
                      {added ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <Check className="size-3.5" aria-hidden /> In your garden
                        </span>
                      ) : (
                        <span />
                      )}
                      <Link
                        href={`/habits/new?template=${t.slug}`}
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-primary transition hover:bg-tint"
                        aria-label={`Customise and add ${t.name}`}
                      >
                        {added ? "Add another" : "Customise & add"} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
