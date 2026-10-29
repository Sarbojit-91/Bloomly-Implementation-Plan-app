"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, FlaskConical, MailCheck } from "lucide-react";
import {
  requestPasswordReset,
  resendVerification,
  signIn,
  signUp,
  updatePassword,
  type FormState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/primitives";

function PasswordInput({
  id,
  name,
  autoComplete,
  error,
}: {
  id: string;
  name: string;
  autoComplete: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-1 my-1 grid w-10 place-items-center rounded-xl text-muted hover:bg-tint hover:text-primary"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const initial: FormState = {};

function DevMailboxLink() {
  return (
    <Link href="/dev/mailbox" className="font-semibold underline underline-offset-2">
      Open the dev mailbox
    </Link>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && (
        <Alert tone="error">
          {state.message}
          {state.values?.unconfirmed && (
            <>
              {" "}
              <Link
                className="font-semibold underline"
                href={`/verify-email?email=${encodeURIComponent(state.values.email ?? "")}`}
              >
                Resend the link
              </Link>
            </>
          )}
        </Alert>
      )}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.errors?.email)}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
        />
      </Field>
      <Field
        label={
          <span className="flex items-center justify-between">
            Password
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </span>
        }
        htmlFor="password"
        error={state.errors?.password}
      >
        <PasswordInput id="password" name="password" autoComplete="current-password" error={state.errors?.password} />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Sign in
      </Button>
    </form>
  );
}

/** Local test mode only: one-click sign-in with the pre-confirmed demo account. */
export function DemoSignIn({ email, password, next }: { email: string; password: string; next?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="rounded-2xl border border-dashed border-accent/60 bg-tint/60 p-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="password" value={password} />
      <input type="hidden" name="next" value={next ?? ""} />
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <FlaskConical className="size-4" aria-hidden /> Demo account (local test mode)
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Already registered and confirmed, so no email needed.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">Email</dt>
        <dd className="font-mono text-ink">{email}</dd>
        <dt className="text-muted">Password</dt>
        <dd className="font-mono text-ink">{password}</dd>
      </dl>
      {state.message && (
        <Alert tone="error" className="mt-3">
          {state.message}
        </Alert>
      )}
      <Button type="submit" variant="soft" loading={pending} className="mt-3 w-full">
        Use demo account
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's timezone is only known after mount
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="timezone" value={timezone} />
      <Field label="What should we call you?" htmlFor="displayName" error={state.errors?.displayName}>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="given-name"
          required
          maxLength={60}
          defaultValue={state.values?.displayName}
          aria-invalid={Boolean(state.errors?.displayName)}
          aria-describedby={state.errors?.displayName ? "displayName-error" : undefined}
        />
      </Field>
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.errors?.email)}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        hint="At least 8 characters, with a letter and a number."
        error={state.errors?.password}
      >
        <PasswordInput id="password" name="password" autoComplete="new-password" error={state.errors?.password} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={state.errors?.confirmPassword}>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          error={state.errors?.confirmPassword}
        />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Create my account
      </Button>
    </form>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerification, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.message && (
        <Alert tone={state.ok ? "success" : "error"}>
          {state.message} {state.devMailbox && <DevMailboxLink />}
        </Alert>
      )}
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" required defaultValue={email} autoComplete="email" />
      </Field>
      <Button type="submit" variant="secondary" loading={pending}>
        <MailCheck className="size-4" aria-hidden /> Resend confirmation email
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  if (state.ok)
    return (
      <Alert tone="success">
        {state.message} {state.devMailbox && <DevMailboxLink />}
      </Alert>
    );
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.errors?.email)}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
        />
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function NewPasswordForm({ context = "reset" }: { context?: "reset" | "settings" }) {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate key={state.ok ? "done" : "form"}>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <input type="hidden" name="context" value={context} />
      <Field
        label="New password"
        htmlFor="password"
        hint="At least 8 characters, with a letter and a number."
        error={state.errors?.password}
      >
        <PasswordInput id="password" name="password" autoComplete="new-password" error={state.errors?.password} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={state.errors?.confirmPassword}>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          error={state.errors?.confirmPassword}
        />
      </Field>
      <Button type="submit" size={context === "settings" ? "md" : "lg"} loading={pending} className="self-start">
        {context === "settings" ? "Update password" : "Save new password"}
      </Button>
    </form>
  );
}
