"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 p-10 text-center">
      <span className="text-4xl" aria-hidden>
        🥀
      </span>
      <h1 className="font-display text-2xl font-semibold">Something wilted</h1>
      <p className="text-sm text-ink-soft">
        We couldn&apos;t load this page. Your data is safe. This is usually a temporary connection hiccup.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>
          <RefreshCw className="size-4" aria-hidden /> Try again
        </Button>
        <ButtonLink href="/today" variant="ghost">
          Go to Today
        </ButtonLink>
      </div>
    </Card>
  );
}
