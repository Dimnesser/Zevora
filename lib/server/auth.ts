import "server-only";

import { cookies } from "next/headers";
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb, now } from "@/lib/server/db";
import { randomToken } from "@/lib/server/rng";

export const SESSION_COOKIE = "zv_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;

export interface AuthUser {
  id: number;
  username: string;
  role: "user" | "owner";
  balance_minor: number;
  avatar_seed: string;
  level: number;
  xp: number;
  partner_tier: string | null;
  partner_since: number | null;
  promo_code: string | null;
  ref_code: string | null;
  partner_perks: string | null;
  partner_daily_minor: number | null;
  partner_ref_multiplier: number | null;
  partner_campaigns: string | null;
  daily_claimed_at: number | null;
  daily_streak: number;
  registration_bonus_claimed: number;
  created_at: number;
}

/* ───────────────────────── passwords ───────────────────────── */

export function hashPassword(password: string): {
  hash: string;
  salt: string;
} {
  const salt = randomToken(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("base64");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "base64");
  if (candidate.length !== expected.length) return false;
  // Constant-time compare so a wrong password cannot be narrowed by timing.
  return timingSafeEqual(candidate, expected);
}

/* ───────────────────────── sessions ───────────────────────── */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a session and returns the raw token for the cookie. */
export function createSession(userId: number): string {
  const token = randomToken(32);
  const ts = now();
  getDb()
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(hashToken(token), userId, ts, ts + SESSION_TTL_MS);
  return token;
}

export function destroySession(token: string): void {
  getDb()
    .prepare(`DELETE FROM sessions WHERE token_hash = ?`)
    .run(hashToken(token));
}

export function userForToken(token: string): AuthUser | null {
  const row = getDb()
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now()) as AuthUser | undefined;
  return row ?? null;
}

/**
 * Resolves the caller from the session cookie.
 *
 * The identity always comes from the cookie — never from a body field or
 * query parameter — so a client cannot act as another user by editing a
 * request.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Deletes expired rows. Called opportunistically on login. */
export function pruneSessions(): void {
  getDb().prepare(`DELETE FROM sessions WHERE expires_at <= ?`).run(now());
}

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export const MIN_PASSWORD_LENGTH = 6;
