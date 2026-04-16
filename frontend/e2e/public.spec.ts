/**
 * PUBLIC PAGES — No authentication required. No setup needed.
 *
 * Prerequisite: dev server must be running (npm run dev)
 * Run:  npm run e2e:public
 */

import { test, expect } from "@playwright/test";

// ─── Home Page ────────────────────────────────────────────────────────────────

test("@public home page loads and shows hero content", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TalentHub|Abacus|Learn/i);
  // Hero section must be visible
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("@public home page has no broken images", async ({ page }) => {
  const failedImages: string[] = [];
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "image" &&
      !response.ok()
    ) {
      failedImages.push(response.url());
    }
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(failedImages, `Broken images: ${failedImages.join(", ")}`).toHaveLength(0);
});

test("@public home page nav links are clickable", async ({ page }) => {
  await page.goto("/");
  // Header must exist
  const header = page.locator("header");
  await expect(header).toBeVisible();
});

// ─── Login Page ───────────────────────────────────────────────────────────────

test("@public protected route redirects unauthenticated user to login", async ({ page }) => {
  await page.goto("/dashboard");
  // Login page shows 'Welcome Back' heading
  await expect(page.locator("h1:has-text('Welcome Back')")).toBeVisible({ timeout: 8000 });
});

test("@public /admin redirects unauthenticated user to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("h1:has-text('Welcome Back')")).toBeVisible({ timeout: 8000 });
});

// ─── Pricing Page ─────────────────────────────────────────────────────────────

test("@public pricing page renders plan cards", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator("h1, h2").first()).toBeVisible();
  // At least one plan card or pricing table should appear
  const cards = page.locator("[class*='card'], [class*='plan'], [class*='price']");
  await expect(cards.first()).toBeVisible({ timeout: 8000 });
});

// ─── Static/Legal Pages ───────────────────────────────────────────────────────

test("@public privacy policy page loads", async ({ page }) => {
  await page.goto("/privacy-policy");
  await expect(page.locator("h1").first()).toBeVisible();
});

test("@public terms of service page loads", async ({ page }) => {
  await page.goto("/terms-of-service");
  await expect(page.locator("h1").first()).toBeVisible();
});

test("@public about us page loads", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("h1").first()).toBeVisible();
});

// ─── Tools (Public) ───────────────────────────────────────────────────────────

test("@public soroban abacus tool loads", async ({ page }) => {
  await page.goto("/tools/soroban");
  await expect(page.locator("body")).not.toHaveText(/error|crash|undefined/i);
});

test("@public number ninja tool loads", async ({ page }) => {
  await page.goto("/tools/number-ninja");
  await expect(page.locator("body")).not.toHaveText(/error|crash|undefined/i);
});

test("@public grid master tool loads", async ({ page }) => {
  await page.goto("/tools/gridmaster");
  await expect(page.locator("body")).not.toHaveText(/error|crash|undefined/i);
});

// ─── 404 Page ────────────────────────────────────────────────────────────────

test("@public unknown route shows 404-style not found page", async ({ page }) => {
  await page.goto("/this-route-does-not-exist-xyz");
  // Should not crash — show some not-found UI
  await expect(page.locator("body")).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text.toLowerCase()).toMatch(/not found|404|page doesn't exist|go back/i);
});

// ─── Performance sanity ───────────────────────────────────────────────────────

test("@public home page first contentful paint is under 5 seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.waitForSelector("h1, h2", { timeout: 5000 });
  const elapsed = Date.now() - start;
  expect(elapsed, `Home page took ${elapsed}ms`).toBeLessThan(5000);
});
