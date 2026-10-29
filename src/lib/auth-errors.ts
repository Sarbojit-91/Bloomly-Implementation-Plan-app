/** Turn Supabase auth errors into friendly, non-technical messages. */
export function friendlyAuthError(message: string | undefined | null, code?: string | null): string {
  const m = (message ?? "").toLowerCase();
  const c = (code ?? "").toLowerCase();
  if (c === "invalid_credentials" || m.includes("invalid login credentials"))
    return "That email and password don't match. Double-check them and try again.";
  if (c === "email_not_confirmed" || m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the link we sent.";
  if (c === "user_already_exists" || m.includes("already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (c === "weak_password" || m.includes("password should"))
    return "Please choose a stronger password: at least 8 characters with letters and numbers.";
  if (c === "same_password" || m.includes("different from the old"))
    return "Your new password needs to be different from your current one.";
  if (c.includes("rate_limit") || m.includes("rate limit") || m.includes("security purposes"))
    return "Too many attempts in a short time. Please wait a minute and try again.";
  if (c === "otp_expired" || m.includes("expired") || m.includes("invalid"))
    return "This link has expired or was already used. Please request a new one.";
  if (m.includes("fetch") || m.includes("network"))
    return "We couldn't reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}
