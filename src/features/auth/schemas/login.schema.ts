import { z } from "zod";

/**
 * Signing in only checks that something was typed. Strength rules belong where a
 * password is chosen, not where it is used: a temporary password an administrator
 * set (8+ characters, the API's only rule) has to work here as typed, and refusing
 * it client-side would lock that person out with no way to reach the server.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
