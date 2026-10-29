"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

/**
 * Shows a one-off toast passed from the server (e.g. after a redirect) and
 * then removes the query string, so refreshing doesn't show it again.
 */
export function FlashToast({
  tone,
  title,
  description,
}: {
  tone: "success" | "error" | "info" | "celebrate";
  title: string;
  description?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast.toast({ tone, title, description });
    router.replace(pathname, { scroll: false });
  }, [toast, tone, title, description, router, pathname]);

  return null;
}
