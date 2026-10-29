import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, Inbox, MailOpen } from "lucide-react";
import { isLocalMode } from "@/lib/backend";
import { Wordmark } from "@/components/brand/bloom";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Dev mailbox" };

/**
 * Local test mode only: shows the confirmation and password-reset emails
 * Bloomly would have sent, so those flows can be tested without an email
 * provider. Returns 404 when Bloomly is connected to Supabase.
 */
export default async function DevMailboxPage() {
  await connection();
  if (!isLocalMode) notFound();
  const { listDevEmails } = await import("@/lib/backend/local/auth");
  const emails = await listDevEmails();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Link href="/" className="self-start rounded-xl">
        <Wordmark />
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Local test mode</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Dev mailbox</h1>
        <p className="mt-2 text-ink-soft">
          Bloomly isn&apos;t connected to an email service, so confirmation and password-reset emails land here instead.
          Newest first. Refresh to check for new ones.
        </p>
      </div>
      {emails.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Inbox className="size-8 text-accent" aria-hidden />
          <p className="font-semibold">No emails yet</p>
          <p className="text-sm text-muted">Sign up or request a password reset and the email will appear here.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {emails.map((e) => (
            <li key={e.id}>
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tint text-primary">
                    <MailOpen className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.subject}</p>
                    <p className="text-xs text-muted">
                      To {e.to} · {new Date(e.sentAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">{e.body}</p>
                    <a
                      href={e.link}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:bg-primary-hover"
                    >
                      {e.subject.startsWith("Confirm") ? "Confirm my email" : "Choose a new password"}
                      <ArrowRight className="size-4" aria-hidden />
                    </a>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
