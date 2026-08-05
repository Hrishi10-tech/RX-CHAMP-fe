import type { Role } from "@/constants/roles";

export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface LoginData {
  token: string;
  user: AuthUser;
}

export type LoginFailureReason =
  | "invalid_credentials"
  | "account_blocked"
  | "network"
  | "server"
  | "unknown";

export type LoginResult =
  | { ok: true; token: string; user: AuthUser }
  | { ok: false; reason: LoginFailureReason; message?: string };

export interface AuthState {
  user: AuthUser | null;
  role: Role | null;
  ready: boolean;
}

export interface UseSessionResult {
  user: AuthUser | null;
  role: Role | null;
  ready: boolean;
  logout: () => void;
}
