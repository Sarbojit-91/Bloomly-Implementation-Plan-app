import Link from "next/link";
import { Wordmark } from "@/components/brand/bloom";
import { AuthArt } from "@/components/auth/auth-art";
import { LocalModeBanner } from "@/components/app/local-mode-banner";
import { isLocalMode } from "@/lib/backend";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`grid min-h-dvh lg:grid-cols-[1.05fr_1fr] ${isLocalMode ? "grid-rows-[auto_1fr]" : ""}`}>
      {isLocalMode && (
        <div className="lg:col-span-2">
          <LocalModeBanner />
        </div>
      )}
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" className="self-start rounded-xl" aria-label="Bloomly home">
          <Wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <AuthArt />
    </div>
  );
}
