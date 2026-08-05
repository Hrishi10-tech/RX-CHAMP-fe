import { expect, test } from "@playwright/test";

/**
 * Auth E2E. Requires a running backend at NEXT_PUBLIC_API_URL with the seeded
 * credentials below. Adjust to your environment.
 */
const EMAIL = process.env.E2E_EMAIL ?? "admin@timechamp.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "admin123";

test.describe("Authentication", () => {
  test("rejects an unauthenticated user from a protected page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("logs in and lands on the dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
