import type { Metadata } from "next";
import Link from "next/link";
import { DemoSignIn, SignInForm } from "@/components/auth/auth-forms";
import { isLocalMode } from "@/lib/backend";
import { DEMO_ACCOUNT } from "@/lib/backend/local/demo-account";
import { Alert } from "@/components/ui/primitives";
import { AuthHeading } from "@/components/auth/auth-art";

export const metadata: Metadata = { title: "Sign in" };

const notices: Record<string, string> = {
  confirm_link: "That confirmation link has expired or was already used. Try signing in, or request a new link.",
  reset_link: "That reset link has expired or was already used. Please request a new one.",
};

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? notices[sp.error] : undefined;

  return (
    <div className="animate-fade-up">
      <AuthHeading title="Welcome back" subtitle="Your garden missed you. Sign in to pick up where you left off." />
      <div className="mt-8 flex flex-col gap-4">
        {sp.signedOut === "1" && <Alert tone="info">You&apos;ve been signed out. See you soon!</Alert>}
        {sp.deleted === "1" && <Alert tone="info">Your account and all of its data have been deleted. Take care!</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        {isLocalMode && <DemoSignIn email={DEMO_ACCOUNT.email} password={DEMO_ACCOUNT.password} next={next} />}
        <SignInForm next={next} />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        New to Bloomly?{" "}
        <Link href="/sign-up" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
