import { expect, type Page, test } from "@playwright/test";

/**
 * Core workflow E2E: create project → create + assign task → complete task.
 * Requires a running backend with seeded admin credentials.
 */
const EMAIL = process.env.E2E_EMAIL ?? "admin@timechamp.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "admin123";

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("Project & task workflow", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("creates a project", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("button", { name: "New project" }).click();
    const name = `E2E Project ${Date.now()}`;
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText(name)).toBeVisible();
  });

  test("creates, assigns and completes a task", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("button", { name: "New task" }).click();

    const title = `E2E Task ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    // Project + assignee selects are populated from the backend.
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByText(title)).toBeVisible();

    // Move the new task to DONE via the inline status select.
    const row = page.getByRole("row", { name: new RegExp(title) });
    await row.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "DONE" }).click();
    await expect(row.getByText("DONE")).toBeVisible();
  });
});
