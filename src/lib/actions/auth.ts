"use server";

import { redirect } from "next/navigation";
import { getAuth, isLocalMode } from "@/lib/backend";
import { getUser } from "@/lib/data";
import { friendlyAuthError } from "@/lib/auth-errors";
import { emailSchema, fieldErrors, newPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation";
import { safeNext, siteUrl } from "@/lib/site-url";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  /** Local test mode: point the user at the dev mailbox instead of a real inbox. */
  devMailbox?: boolean;
}

const confirmUrl = async () => `${await siteUrl()}/auth/confirm?next=/today`;
const resetUrl = async () => `${await siteUrl()}/auth/confirm?next=/reset-password`;

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const values = { displayName: raw.displayName ?? "", email: raw.email ?? "" };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { error, signedIn } = await (await getAuth()).signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    displayName: parsed.data.displayName,
    timezone: parsed.data.timezone,
    confirmUrl: await confirmUrl(),
  });
  if (error) return { message: friendlyAuthError(error.message, error.code), values };
  if (signedIn) redirect("/today");
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const values = { email: raw.email ?? "" };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { error } = await (await getAuth()).signIn(parsed.data.email, parsed.data.password);
  if (error) {
    const message = friendlyAuthError(error.message, error.code);
    if (error.code === "email_not_confirmed") return { message, values: { ...values, unconfirmed: "1" } };
    return { message, values };
  }
  redirect(safeNext(raw.next));
}

export async function resendVerification(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { errors: { email: parsed.error.issues[0].message } };

  const { error } = await (await getAuth()).resendConfirmation(parsed.data, await confirmUrl());
  if (error) return { message: friendlyAuthError(error.message, error.code) };
  return {
    ok: true,
    message: isLocalMode
      ? "A fresh confirmation link is in the dev mailbox."
      : "A fresh confirmation link is on its way. It can take a minute to arrive.",
    devMailbox: isLocalMode,
  };
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { errors: { email: parsed.error.issues[0].message }, values: { email: String(formData.get("email") ?? "") } };
  }

  const { error } = await (await getAuth()).requestPasswordReset(parsed.data, await resetUrl());
  // Rate limits are worth surfacing; anything else gets the same neutral reply
  // so the form can't be used to discover which emails have accounts.
  if (error && (error.code ?? "").includes("rate_limit")) return { message: friendlyAuthError(error.message, error.code) };
  return {
    ok: true,
    message: "If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).",
    devMailbox: isLocalMode,
  };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (!(await getUser())) return { message: "Your reset link has expired. Please request a new one." };

  const { error } = await (await getAuth()).updatePassword(parsed.data.password);
  if (error) return { message: friendlyAuthError(error.message, error.code) };

  if (formData.get("context") === "settings") return { ok: true, message: "Your password has been updated." };
  redirect("/today?welcome=password");
}

export async function signOut() {
  await (await getAuth()).signOut();
  redirect("/sign-in?signedOut=1");
}
