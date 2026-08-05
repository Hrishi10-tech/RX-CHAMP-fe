import type { AuthUser } from "@/features/auth/types";

export interface AuthSession {
  token?: string;
  user?: AuthUser;
}
