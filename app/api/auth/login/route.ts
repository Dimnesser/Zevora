import { bootstrap } from "@/lib/server/bootstrap";
import { getDb } from "@/lib/server/db";
import {
  createSession,
  pruneSessions,
  setSessionCookie,
  verifyPassword,
} from "@/lib/server/auth";
import { ApiError, asString, handler, ok, rateLimit, readJson } from "@/lib/server/http";
import { publicUser } from "@/lib/server/presenters";

export const POST = handler(async (req: Request) => {
  bootstrap();
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  // Throttled per address so the login form cannot be brute-forced.
  rateLimit(`login:${ip}`, 20, 60_000);

  const body = await readJson<{ username?: string; password?: string }>(req);
  const username = asString(body.username, "username", { min: 1, max: 40 });
  const password = asString(body.password, "password", { min: 1, max: 200 });

  const row = getDb()
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username) as
    | { id: number; password_hash: string; password_salt: string }
    | undefined;

  // Identical message for unknown user and wrong password: revealing which
  // one is wrong tells an attacker which usernames exist.
  const invalid = new ApiError("unauthorized", "Неверный ник или пароль");
  if (!row) throw invalid;
  if (!verifyPassword(password, row.password_hash, row.password_salt)) {
    throw invalid;
  }

  pruneSessions();
  await setSessionCookie(createSession(row.id));

  const user = getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(row.id);
  return ok({ user: publicUser(user as never) });
});
