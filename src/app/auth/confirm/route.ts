import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/backend";
import { safeNext } from "@/lib/site-url";

/**
 * Landing route for links in confirmation and password-reset emails.
 * Supabase sends either a PKCE `code` or a `token_hash`; local mode always
 * sends a `token_hash`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const type = searchParams.get("type");

  const { ok } = await (await getAuth()).confirm({
    code: searchParams.get("code"),
    tokenHash: searchParams.get("token_hash"),
    type,
  });

  if (ok) {
    const dest = type === "recovery" ? "/reset-password" : next;
    const url = new URL(dest, origin);
    if (dest === "/today") url.searchParams.set("welcome", "verified");
    return NextResponse.redirect(url);
  }

  const failure = new URL("/sign-in", origin);
  failure.searchParams.set("error", next === "/reset-password" || type === "recovery" ? "reset_link" : "confirm_link");
  return NextResponse.redirect(failure);
}
