import type { LoginFailureReason } from "@/features/auth/types";

interface LoginErrorCopy {
  title: string;
  description: string;
  /** Blocked accounts need reading time; the rest are self-explanatory. */
  duration?: number;
}

const COPY: Record<LoginFailureReason, LoginErrorCopy> = {
  invalid_credentials: {
    title: "Incorrect email or password",
    description: "Double-check your details and try again.",
  },
  account_blocked: {
    title: "Account blocked",
    description:
      "An administrator has disabled your access. Contact them to have your account unblocked.",
    duration: 10000,
  },
  network: {
    title: "Can't reach the server",
    description: "Check your internet connection and try again.",
  },
  server: {
    title: "Something went wrong on our end",
    description: "This isn't your fault. Please try again in a moment.",
  },
  rate_limited: {
    title: "Sign-in paused",
    description: "Too many sign-in attempts. Wait a minute, then try again.",
    duration: 10000,
  },
  unknown: {
    title: "Couldn't sign you in",
    description: "Please try again.",
  },
};

export function loginErrorCopy(reason: LoginFailureReason, serverMessage?: string): LoginErrorCopy {
  const base = COPY[reason];
  if ((reason === "account_blocked" || reason === "rate_limited") && serverMessage) {
    return { ...base, description: serverMessage };
  }
  return base;
}
