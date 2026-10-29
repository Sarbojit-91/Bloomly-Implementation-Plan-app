import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

const PROTECTED = ["/today", "/habits", "/templates", "/progress", "/journal", "/settings", "/reset-password"];
const AUTH_ONLY_FOR_GUESTS = ["/sign-in", "/sign-up"];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** Local-mode session cookie (see src/lib/backend/local/auth.ts). */
const LOCAL_SESSION_COOKIE = "bloomly_session";

/**
 * Refreshes the Supabase session cookie on every request and keeps signed-out
 * visitors away from app pages. Pages and actions still check the user
 * themselves; this is the first line, not the only one.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) {
    // Local mode: sessions live in the embedded database, which the proxy
    // doesn't open. Send visitors with no session cookie to sign in; pages
    // fully validate the session themselves.
    const path = request.nextUrl.pathname;
    if (!request.cookies.has(LOCAL_SESSION_COOKIE) && matches(path, PROTECTED)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.search = "";
      url.searchParams.set("next", path + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!signedIn && matches(path, PROTECTED)) {
    return redirectTo("/sign-in", { next: path + request.nextUrl.search });
  }
  if (signedIn && (matches(path, AUTH_ONLY_FOR_GUESTS) || path === "/")) {
    return redirectTo("/today");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
