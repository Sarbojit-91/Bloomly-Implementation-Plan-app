import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthBackend, SessionUser } from "../types";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

/**
 * Local-mode accounts, for trying Bloomly without Supabase. Passwords are
 * hashed with scrypt, sessions are random tokens in an HttpOnly cookie (only
 * a SHA-256 hash is stored), and confirmation/reset "emails" are written to a
 * dev mailbox instead of being sent. Not intended for production use.
 */

const COOKIE = "bloomly_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

async function startSession(userId: string) {
  const db = await getDb();
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.query(`insert into auth.sessions (token_hash, user_id, expires_at) values ($1, $2, $3)`, [
    sha256(token),
    userId,
    expires.toISOString(),
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

async function sendLink(
  userId: string,
  email: string,
  type: "signup" | "recovery",
  baseUrl: string,
) {
  const db = await getDb();
  const token = newToken();
  const hours = type === "signup" ? 24 : 1;
  await db.query(`delete from auth.one_time_tokens where user_id = $1 and type = $2`, [userId, type]);
  await db.query(`insert into auth.one_time_tokens (token_hash, user_id, type, expires_at) values ($1, $2, $3, $4)`, [
    sha256(token),
    userId,
    type,
    new Date(Date.now() + hours * 3_600_000).toISOString(),
  ]);
  const url = new URL(baseUrl);
  url.searchParams.set("token_hash", token);
  url.searchParams.set("type", type);
  const subject = type === "signup" ? "Confirm your Bloomly account" : "Reset your Bloomly password";
  const body =
    type === "signup"
      ? "Welcome to Bloomly! Click the link to confirm your email address. It expires in 24 hours."
      : "Someone asked to reset your Bloomly password. If it was you, click the link. It expires in 1 hour.";
  await db.query(`insert into auth.dev_outbox (to_email, subject, body, link) values ($1, $2, $3, $4)`, [
    email,
    subject,
    body,
    url.toString(),
  ]);
}

async function findUser(email: string) {
  const db = await getDb();
  const res = await db.query<{ id: string; email: string; encrypted_password: string | null; email_confirmed_at: Date | null }>(
    `select id, email, encrypted_password, email_confirmed_at from auth.users where email = $1`,
    [email.trim().toLowerCase()],
  );
  return res.rows[0] ?? null;
}

export const localAuth: AuthBackend = {
  async getSessionUser(): Promise<SessionUser | null> {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const db = await getDb();
    const res = await db.query<{ id: string; email: string }>(
      `select u.id, u.email from auth.sessions s join auth.users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now() and u.email_confirmed_at is not null`,
      [sha256(token)],
    );
    return res.rows[0] ?? null;
  },

  async signUp({ email, password, displayName, timezone, confirmUrl }) {
    const existing = await findUser(email);
    if (existing?.email_confirmed_at) {
      return { error: { message: "User already registered", code: "user_already_exists" } };
    }
    const db = await getDb();
    let userId = existing?.id;
    if (!userId) {
      const res = await db.query<{ id: string }>(
        `insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, $2, $3) returning id`,
        [email.trim().toLowerCase(), await hashPassword(password), JSON.stringify({ display_name: displayName, timezone })],
      );
      userId = res.rows[0].id;
    } else {
      // Unconfirmed sign-up retried: take the latest password and details.
      await db.query(`update auth.users set encrypted_password = $2 where id = $1`, [userId, await hashPassword(password)]);
      await db.query(`update public.profiles set display_name = $2, timezone = $3 where id = $1`, [userId, displayName, timezone]);
    }
    await sendLink(userId, email.trim().toLowerCase(), "signup", confirmUrl);
    return { signedIn: false };
  },

  async signIn(email, password) {
    const user = await findUser(email);
    const ok = await verifyPassword(password, user?.encrypted_password ?? null);
    if (!user || !ok) return { error: { message: "Invalid login credentials", code: "invalid_credentials" } };
    if (!user.email_confirmed_at) return { error: { message: "Email not confirmed", code: "email_not_confirmed" } };
    await startSession(user.id);
    return {};
  },

  async resendConfirmation(email, confirmUrl) {
    const user = await findUser(email);
    if (user && !user.email_confirmed_at) await sendLink(user.id, user.email, "signup", confirmUrl);
    return {};
  },

  async requestPasswordReset(email, resetUrl) {
    const user = await findUser(email);
    if (user) await sendLink(user.id, user.email, "recovery", resetUrl);
    return {};
  },

  async confirm({ tokenHash, type }) {
    if (!tokenHash || (type !== "signup" && type !== "recovery")) return { ok: false };
    const db = await getDb();
    const res = await db.query<{ user_id: string }>(
      `delete from auth.one_time_tokens where token_hash = $1 and type = $2 and expires_at > now() returning user_id`,
      [sha256(tokenHash), type],
    );
    const userId = res.rows[0]?.user_id;
    if (!userId) return { ok: false };
    // Following either link proves the user owns the address.
    await db.query(`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1`, [userId]);
    await startSession(userId);
    return { ok: true };
  },

  async updatePassword(password) {
    const user = await this.getSessionUser();
    if (!user) return { error: { message: "Auth session missing", code: "session_missing" } };
    const db = await getDb();
    const current = await findUser(user.email);
    if (await verifyPassword(password, current?.encrypted_password ?? null)) {
      return { error: { message: "New password should be different from the old password.", code: "same_password" } };
    }
    await db.query(`update auth.users set encrypted_password = $2 where id = $1`, [user.id, await hashPassword(password)]);
    // Sign out other devices; keep this session.
    const token = (await cookies()).get(COOKIE)?.value ?? "";
    await db.query(`delete from auth.sessions where user_id = $1 and token_hash <> $2`, [user.id, sha256(token)]);
    return {};
  },

  async signOut() {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (token) {
      const db = await getDb();
      await db.query(`delete from auth.sessions where token_hash = $1`, [sha256(token)]);
    }
    store.delete(COOKIE);
  },

  async deleteAccount(userId) {
    const db = await getDb();
    await db.query(`delete from auth.users where id = $1`, [userId]);
    (await cookies()).delete(COOKIE);
    return {};
  },
};

export interface DevEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  link: string;
  sentAt: string;
}

/** Latest messages in the local dev mailbox. */
export async function listDevEmails(limit = 25): Promise<DevEmail[]> {
  const db = await getDb();
  const res = await db.query<{ id: number; to_email: string; subject: string; body: string; link: string; created_at: Date }>(
    `select id, to_email, subject, body, link, created_at from auth.dev_outbox order by id desc limit $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    to: r.to_email,
    subject: r.subject,
    body: r.body,
    link: r.link,
    sentAt: new Date(r.created_at).toISOString(),
  }));
}

export const LOCAL_SESSION_COOKIE = COOKIE;
