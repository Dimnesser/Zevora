import "server-only";

import { NextResponse } from "next/server";
import { getSessionUser, type AuthUser } from "@/lib/server/auth";

/** Error codes the client switches on. Messages are user-facing Russian. */
export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "insufficient_funds"
  | "conflict"
  | "rate_limited"
  | "server_error";

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 422,
  insufficient_funds: 402,
  conflict: 409,
  rate_limited: 429,
  server_error: 500,
};

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(code: ApiErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status: STATUS[code] });
}

/**
 * Wraps a handler so thrown ApiErrors become clean responses and anything
 * else becomes a 500 without leaking internals to the client.
 */
export function handler<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.code, err.message);
      console.error("[api]", err);
      return fail("server_error", "Внутренняя ошибка сервера");
    }
  };
}

/** Throws unless a valid session cookie is present. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("unauthorized", "Требуется вход в аккаунт");
  return user;
}

export async function requireOwner(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "owner") {
    throw new ApiError("forbidden", "Недостаточно прав");
  }
  return user;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("invalid_input", "Некорректное тело запроса");
  }
}

/* ───────────────────────── validation ───────────────────────── */

export function asInt(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n)) {
    throw new ApiError("invalid_input", `Поле ${field} должно быть целым числом`);
  }
  if (opts.min !== undefined && n < opts.min) {
    throw new ApiError("invalid_input", `Поле ${field}: минимум ${opts.min}`);
  }
  if (opts.max !== undefined && n > opts.max) {
    throw new ApiError("invalid_input", `Поле ${field}: максимум ${opts.max}`);
  }
  return n;
}

export function asString(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; pattern?: RegExp } = {},
): string {
  if (typeof value !== "string") {
    throw new ApiError("invalid_input", `Поле ${field} должно быть строкой`);
  }
  const s = value.trim();
  if (opts.min !== undefined && s.length < opts.min) {
    throw new ApiError("invalid_input", `Поле ${field}: минимум ${opts.min} симв.`);
  }
  if (opts.max !== undefined && s.length > opts.max) {
    throw new ApiError("invalid_input", `Поле ${field}: максимум ${opts.max} симв.`);
  }
  if (opts.pattern && !opts.pattern.test(s)) {
    throw new ApiError("invalid_input", `Поле ${field} имеет неверный формат`);
  }
  return s;
}

export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

/* ───────────────────────── rate limiting ───────────────────────── */

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Multiplier for load testing. Production leaves this at 1; the
 * simulation harness raises it so a synthetic burst is not throttled.
 */
const RATE_MULTIPLIER = Math.max(
  1,
  Number(process.env.ZEVORA_RATE_MULTIPLIER ?? 1) || 1,
);

/**
 * Fixed-window limiter. In-process, which is enough for a single node;
 * a multi-instance deployment would move this to Redis.
 */
export function rateLimit(key: string, rawLimit: number, windowMs: number): void {
  const limit = rawLimit * RATE_MULTIPLIER;
  const nowTs = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= nowTs) {
    buckets.set(key, { count: 1, resetAt: nowTs + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw new ApiError("rate_limited", "Слишком много запросов. Подождите немного");
  }
  bucket.count += 1;
}
