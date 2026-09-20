import { bootstrap } from "@/lib/server/bootstrap";
import { getSessionUser } from "@/lib/server/auth";
import { handler, ok } from "@/lib/server/http";
import { publicUser } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  bootstrap();
  const user = await getSessionUser();
  return ok({ user: user ? publicUser(user) : null });
});
