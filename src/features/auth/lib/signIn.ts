import { normalizeRole, type Role } from "@/constants/roles";
import type { AuthUser, MeView } from "@/features/auth/types";
import type { AuthSession } from "@/lib/auth/types";

export type SignInOutcome =
  | { ok: true; role: Role; session: AuthSession }
  | { ok: false; reason: "staff" | "unknown_role" };

/**
 * After the password is accepted: who this really is, from GET /me (SPEC 5.3).
 * Staff are refused (they use the agent). When /me cannot be read, the role the
 * sign-in answer carried is used instead, which is the server's word as well.
 */
export async function resolveSignIn(
  user: AuthUser,
  fetchMe: () => Promise<MeView>,
): Promise<SignInOutcome> {
  let me: MeView | null = null;
  try {
    me = await fetchMe();
  } catch {
    me = null;
  }
  const role = me?.role ?? normalizeRole(user.role);
  if (!role) return { ok: false, reason: "unknown_role" };
  if (role === "USER" || me?.permissions?.canUsePortal === false) {
    return { ok: false, reason: "staff" };
  }
  return {
    ok: true,
    role,
    session: {
      user: me
        ? { id: me.id, email: me.email, name: me.name, role: me.role, grants: me.grants }
        : { ...user, role },
    },
  };
}
