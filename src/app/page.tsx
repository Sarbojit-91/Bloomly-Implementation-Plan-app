import Link from "next/link";
import { BarChart3, BellRing, BookHeart, CalendarCheck2, Flower2, HeartHandshake, Lock, Sparkles } from "lucide-react";
import { Bloom, Wordmark } from "@/components/brand/bloom";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: "Schedules that fit real life",
    body: "Daily, weekdays, or “3 times a week”. Rest days are never counted against you.",
  },
  {
    icon: Flower2,
    title: "Watch your day bloom",
    body: "Each habit is a petal. Check one off and see your flower fill in.",
  },
  {
    icon: BarChart3,
    title: "Honest, kind insights",
    body: "Streaks, trends and a year-long heatmap, all calculated from what you actually did.",
  },
  {
    icon: BookHeart,
    title: "A tiny daily journal",
    body: "Log your mood and a few words. Private to you, always.",
  },
  {
    icon: BellRing,
    title: "Gentle reminders",
    body: "A quiet nudge at the time you choose. Never nagging.",
  },
  {
    icon: Sparkles,
    title: "Milestones worth celebrating",
    body: "First blooms, seven in a row, personal bests. Earned once, yours to keep.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/sign-in" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-soft hover:bg-tint hover:text-primary">
            Sign in
          </Link>
          <ButtonLink href="/sign-up" size="sm">
            Get started
          </ButtonLink>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-tint px-3 py-1 text-xs font-semibold text-primary">
              <HeartHandshake className="size-3.5" aria-hidden /> No guilt. Just growth.
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Habits that <span className="italic text-primary">bloom</span>, one small day at a time.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">
              Bloomly is a calm, encouraging habit tracker. Plan habits around your real week, celebrate every check-in, and see
              your consistency grow, without being scolded for the days life gets in the way.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/sign-up" size="lg">
                Start growing, it&apos;s free
              </ButtonLink>
              <ButtonLink href="/sign-in" size="lg" variant="secondary">
                I have an account
              </ButtonLink>
            </div>
          </div>

          <div className="relative mx-auto animate-fade-up [animation-delay:120ms]">
            <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-tint-strong/50 blur-3xl" aria-hidden />
            <Card className="w-[min(100%,22rem)] p-6">
              <div className="flex justify-center">
                <Bloom done={4} due={6} size={220} />
              </div>
              <p className="mt-2 text-center font-display text-2xl font-semibold">
                4 <span className="text-muted">/ 6</span>
              </p>
              <p className="text-center text-sm text-muted">An example day: more than halfway there</p>
              <ul className="mt-5 flex flex-col gap-2 text-sm" aria-label="Example habits">
                {[
                  ["Read 20 pages", true],
                  ["Morning walk", true],
                  ["Drink 2 litres", false],
                ].map(([label, done]) => (
                  <li key={String(label)} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2">
                    <span
                      className={
                        done
                          ? "grid size-5 place-items-center rounded-full bg-primary text-[10px] text-white"
                          : "size-5 rounded-full border-2 border-tint-strong"
                      }
                      aria-hidden
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span className={done ? "text-ink-soft line-through" : ""}>{label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 id="features" className="text-center font-display text-3xl font-semibold tracking-tight">
            Everything you need, nothing that nags
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <Card className="h-full p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="grid size-11 place-items-center rounded-2xl bg-tint text-primary">
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{f.body}</p>
                </Card>
              </li>
            ))}
          </ul>
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Lock className="size-4" aria-hidden /> Your habits and journal are private to your account.
          </p>
        </section>
      </main>

      <footer className="border-t border-line/70 py-6 text-center text-xs text-muted">Bloomly · Grow at your own pace 🌸</footer>
    </div>
  );
}
