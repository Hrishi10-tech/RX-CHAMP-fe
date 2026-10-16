import { MIN_PASSWORD_LENGTH, PASSWORD_RULE, newPasswordProblem } from "./passwordRules";
import { loginSchema } from "@/features/auth/schemas/login.schema";

describe("newPasswordProblem", () => {
  it("only asks for the length the API requires", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(PASSWORD_RULE).toBe("At least 8 characters.");
    expect(newPasswordProblem("")).toBe("Enter a password.");
    expect(newPasswordProblem("1234567")).toBe("Use at least 8 characters.");
    expect(newPasswordProblem("abcdefgh")).toBeNull();
    expect(newPasswordProblem("x".repeat(129))).toBe("Use at most 128 characters.");
  });
});

describe("loginSchema", () => {
  // Strength rules belong where a password is chosen: an existing or temporary
  // password must be accepted as typed, or its owner is locked out client-side.
  it("accepts any non-empty password", () => {
    const ok = loginSchema.safeParse({
      email: "user@timechamp.test",
      password: "user123",
      remember: false,
    });
    expect(ok.success).toBe(true);
  });

  it("still requires an email and a password", () => {
    const bad = loginSchema.safeParse({ email: "", password: "", remember: false });
    expect(bad.success).toBe(false);
  });
});
