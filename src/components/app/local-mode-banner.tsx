import Link from "next/link";
import { FlaskConical } from "lucide-react";

/** Thin strip shown while Bloomly runs without Supabase (local test mode). */
export function LocalModeBanner() {
  return (
    <div className="bg-[#1d1530] px-4 py-1.5 text-center text-xs text-white/85">
      <FlaskConical className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
      Local test mode: your data is saved on this computer, and emails go to the{" "}
      <Link href="/dev/mailbox" className="font-semibold text-white underline underline-offset-2">
        dev mailbox
      </Link>
      .
    </div>
  );
}
