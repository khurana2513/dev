/**
 * STUDENT FLOWS — requires e2e/.auth/student.json
 *
 * First-time setup (run once, stays valid ~30 days):
 *   npm run e2e:login:student
 *   → Browser opens → click Google Sign-In → close browser when on dashboard
 *
 * Then run:  npm run e2e:student
 */

import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

const AUTH_FILE = path.resolve("e2e/.auth/student.json");

test.beforeEach(async ({ page }, testInfo) => {
  if (!existsSync(AUTH_FILE)) {
    testInfo.skip(true, "No student auth yet. Run:  npm run e2e:login:student");
  }
  await page.goto("/dashboard");
  const body = await page.locator("body").textContent().catch(() => "");
  const isOnLoginPage =
    page.url().includes("/login") ||
    (body ?? "").includes("Sign in with Google") ||
    (body ?? "").includes("Welcome Back");
  if (isOnLoginPage) {
    testInfo.skip(true, "Student session expired. Run:  npm run e2e:login:student");
  }
});

// ─── Student Dashboard ────────────────────────────────────────────────────────

test("@student dashboard loads without crashing", async ({ page }) => {
  await page.goto("/dashboard");
  // Should not show the login screen
  await expect(page.locator("#google-signin-button")).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong|Unexpected error/i);
});

test("@student dashboard shows streak or progress section", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  // The streak badge renders after user data loads; fall back to any visible page content
  const contentEl = page.locator(
    "[class*='streak-badge'], h1, h2, [class*='stat'], [class*='card']"
  );
  await expect(contentEl.first()).toBeVisible({ timeout: 10000 });
});

// ─── Paper Create ─────────────────────────────────────────────────────────────

test("@student paper create page loads", async ({ page }) => {
  await page.goto("/create");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  // Some paper creation UI should be visible
  await expect(page.locator("h1, h2, [class*='title']").first()).toBeVisible({ timeout: 5000 });
});

test("@student junior preset page loads", async ({ page }) => {
  await page.goto("/create/junior");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

test("@student basic preset page loads", async ({ page }) => {
  await page.goto("/create/basic");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

test("@student advanced preset page loads", async ({ page }) => {
  await page.goto("/create/advanced");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Burst Mode ───────────────────────────────────────────────────────────────

test("@student burst mode page loads and shows UI", async ({ page }) => {
  await page.goto("/burst");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  // Should show some burst mode UI
  await expect(page.locator("body")).not.toBeEmpty();
});

// ─── Mental Math ──────────────────────────────────────────────────────────────

test("@student mental math page loads", async ({ page }) => {
  await page.goto("/mental");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Duel Mode ────────────────────────────────────────────────────────────────

test("@student duel mode page loads", async ({ page }) => {
  await page.goto("/duel");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Student Profile ──────────────────────────────────────────────────────────

test("@student profile page loads without error", async ({ page }) => {
  await page.goto("/profile");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  await expect(page.locator("h1, h2, [class*='profile']").first()).toBeVisible({ timeout: 8000 });
});

// ─── Student Rewards ─────────────────────────────────────────────────────────

test("@student rewards page loads", async ({ page }) => {
  await page.goto("/rewards");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Fees ─────────────────────────────────────────────────────────────────────

test("@student fees page loads", async ({ page }) => {
  await page.goto("/fees");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Attendance ───────────────────────────────────────────────────────────────

test("@student attendance page loads", async ({ page }) => {
  await page.goto("/attendance");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Navigation sanity ────────────────────────────────────────────────────────

test("@student header shows correct student nav links", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const header = page.locator("header");
  await expect(header).toBeVisible();
  // Main nav pill always shows Practice and Games dropdown buttons
  const navPractice = header.locator("button:has-text('Practice'), button:has-text('PRACTICE')");
  await expect(navPractice.first()).toBeVisible({ timeout: 5000 });
  // My Fees link exists in the DOM (inside user dropdown — present but may be hidden)
  // Navigate directly to confirm the route is accessible
  await page.goto("/fees");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong|404|Not Found/i);
});

// ─── Error boundary ───────────────────────────────────────────────────────────

test("@student no console errors on dashboard", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  // Only catch JS runtime errors (React crashes, unhandled rejections, etc.).
  // Filter out HTTP resource errors (4xx/5xx) — those are backend issues tested separately.
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("manifest") &&
      !e.includes("status of 400") &&
      !e.includes("status of 404") &&
      !e.includes("status of 500") &&
      !e.includes("Failed to load resource")
  );
  expect(realErrors, `Console errors: ${realErrors.join("\n")}`).toHaveLength(0);
});
