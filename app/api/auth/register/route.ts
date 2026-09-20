import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import {
  createSession,
  hashPassword,
  MIN_PASSWORD_LENGTH,
  setSessionCookie,
  USERNAME_RE,
} from "@/lib/server/auth";
import { toMinor } from "@/lib/server/money";
import {
  ApiError,
  asString,
  handler,
  ok,
  rateLimit,
  readJson,
} from "@/lib/server/http";
import { publicUser } from "@/lib/server/presenters";

/** Starting balance for a new demo account. */
const WELCOME_BALANCE = toMinor(1000);

export const POST = handler(async (req: Request) => {
  bootstrap();
  rateLimit(`register:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 60_000);

  const body = await readJson<{ username?: string; password?: string }>(req);
  const username = asString(body.username, "username", { pattern: USERNAME_RE });
  const password = asString(body.password, "password", {
    min: MIN_PASSWORD_LENGTH,
    max: 200,
  });

  const db = getDb();
  const taken = db
    .prepare(`SELECT id FROM users WHERE username = ?`)
    .get(username);
  if (taken) throw new ApiError("conflict", "Такой ник уже занят");

  const { hash, salt } = hashPassword(password);
  const ts = now();

  const userId = transact(() => {
    const res = db
      .prepare(
        `INSERT INTO users
           (username, password_hash, password_salt, role, balance_minor,
            avatar_seed, level, xp, ref_code, created_at, updated_at)
         VALUES (?, ?, ?, 'user', ?, ?, 1, 0, ?, ?, ?)`,
      )
      .run(username, hash, salt, WELCOME_BALANCE, username, username, ts, ts);

    const id = Number(res.lastInsertRowid);
    db.prepare(
      `INSERT INTO transactions
         (user_id, kind, label, amount_minor, balance_after_minor, created_at)
       VALUES (?, 'bonus', 'Приветственный баланс', ?, ?, ?)`,
    ).run(id, WELCOME_BALANCE, WELCOME_BALANCE, ts);
    return id;
  });

  await setSessionCookie(createSession(userId));

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  return ok({ user: publicUser(user as never) }, { status: 201 });
});
