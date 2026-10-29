import type { Metadata } from "next";
import Link from "next/link";
import { MailOpen } from "lucide-react";
import { ResendVerificationForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "@/components/auth/auth-art";
import { Alert } from "@/components/ui/primitives";
import { isLocalMode } from "@/lib/backend";

export const metadata: Metadata = { title: "Check your inbox" };

export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <div className="animate-fade-up">
      <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-tint text-primary">
        <MailOpen className="size-7" aria-hidden />
      </div>
      <AuthHeading
        title="Check your inbox"
        subtitle={
          <>
            We sent a confirmation link to {email ? <strong className="text-ink">{email}</strong> : "your email"}. Open it to
            activate your account.
          </>
        }
      />
      {isLocalMode && (
        <Alert tone="info" className="mt-6">
          Local test mode: no real email is sent.{" "}
          <Link href="/dev/mailbox" className="font-semibold underline underline-offset-2">
            Open the dev mailbox
          </Link>{" "}
          and click your confirmation link.
        </Alert>
      )}
      <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-soft">
        <p className="mb-4 text-sm text-muted">Didn&apos;t get it? Check your spam folder, or send it again.</p>
        <ResendVerificationForm email={email} />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Already confirmed?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
