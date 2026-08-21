import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveHomeRoute } from "@/constants/roles";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";

/**
 * The bare domain is the entry point everyone types, so it can't 404. Signed-out
 * visitors land on the login page; signed-in ones skip it and go straight to the
 * dashboard their role starts on, the same target the middleware picks.
 */
export default async function RootPage() {
  const session = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);

  redirect(session ? resolveHomeRoute(session.user?.role) : "/auth/login");
}
