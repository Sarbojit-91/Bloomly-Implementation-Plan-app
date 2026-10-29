import { LogoMark } from "@/components/brand/bloom";

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-ink-soft">{subtitle}</p>}
    </div>
  );
}

/** Decorative brand panel shown beside auth forms on large screens. */
export function AuthArt() {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-gradient-to-br from-[#4a22a3] via-[#5b2ebf] to-[#8b5cf6] lg:block"
    >
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-[#d9ccff]/20 blur-3xl" />
      <LogoMark className="absolute right-16 top-20 size-24 animate-float opacity-50 [--accent:#ffffff] [--primary:#d9ccff]" />
      <LogoMark className="absolute bottom-40 right-40 size-14 animate-float opacity-30 [animation-delay:-2s] [--accent:#ffffff] [--primary:#d9ccff]" />
      <div className="relative flex h-full flex-col justify-end p-14 text-white">
        <p className="font-display text-4xl font-medium leading-tight">
          Small steps,
          <br />
          gently repeated,
          <br />
          become who you are.
        </p>
        <p className="mt-6 max-w-sm text-white/75">
          Bloomly celebrates every check-in and never scolds a missed day. Growth isn&apos;t a straight line.
        </p>
      </div>
    </aside>
  );
}
