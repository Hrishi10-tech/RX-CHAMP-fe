import type { AuthUser } from "@/features/auth/types";

export interface AuthSession {
  user?: AuthUser;
}
