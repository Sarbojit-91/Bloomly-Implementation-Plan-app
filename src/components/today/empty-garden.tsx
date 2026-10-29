import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { LogoMark } from "@/components/brand/bloom";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { HabitIcon } from "@/components/habits/habit-icon";
import { TEMPLATES } from "@/lib/habits/templates";

/** First-run state: no habits yet. Offers a few templates to start from. */
export function EmptyGarden() {
  const picks = TEMPLATES.slice(0, 4);
  return (
    <Card className="relative overflow-hidden p-8 sm:p-12">
      <div className="absolute -right-16 -top-16 size-72 rounded-full bg-tint blur-2xl" aria-hidden />
      <LogoMark className="absolute right-10 top-10 hidden size-24 animate-float opacity-80 sm:block" />
      <div className="relative max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Your garden is ready</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Every bloom starts with a single seed</h2>
        <p className="mt-3 text-ink-soft">
          Add your first habit to get started. Pick something small enough that you can&apos;t say no. You can always grow
          it later.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/templates" size="lg">
            Browse templates <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/habits/new" variant="secondary" size="lg">
            <Plus className="size-4" aria-hidden /> Create my own
          </ButtonLink>
        </div>
      </div>
      <div className="relative mt-10">
        <p className="text-sm font-medium text-muted">Popular starting points</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {picks.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/habits/new?template=${t.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-soft"
              >
                <HabitIcon icon={t.icon} color={t.color} size="sm" />
                <span className="text-sm font-medium">{t.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
