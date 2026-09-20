import { cookies } from "next/headers";
import {
  clearSessionCookie,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/server/auth";
import { handler, ok } from "@/lib/server/http";
import { bootstrap } from "@/lib/server/bootstrap";

export const POST = handler(async () => {
  bootstrap();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  await clearSessionCookie();
  return ok({ ok: true });
});
