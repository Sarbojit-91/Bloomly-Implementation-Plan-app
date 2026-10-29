import { LogoMark } from "@/components/brand/bloom";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <LogoMark className="size-16 animate-float" />
      <h1 className="font-display text-3xl font-semibold">This page hasn&apos;t sprouted</h1>
      <p className="text-ink-soft">We couldn&apos;t find what you were looking for. It may have been moved or deleted.</p>
      <ButtonLink href="/today">Back to Today</ButtonLink>
    </main>
  );
}
