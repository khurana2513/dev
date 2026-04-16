/**
 * ADMIN FLOWS — requires e2e/.auth/admin.json
 *
 * First-time setup (run once, stays valid ~30 days):
 *   npm run e2e:login:admin
 *   → Browser opens → click Google Sign-In with your ADMIN account → close browser
 *
 * Then run:  npm run e2e:admin
 */

import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

const AUTH_FILE = path.resolve("e2e/.auth/admin.json");

test.beforeEach(async ({ page }, testInfo) => {
  if (!existsSync(AUTH_FILE)) {
    testInfo.skip(true, "No admin auth yet. Run:  npm run e2e:login:admin");
  }
  // Navigate to a protected page and check if auth is still valid
  await page.goto("/admin");
  const url = page.url();
  const body = await page.locator("body").textContent().catch(() => "");
  const isOnLoginPage =
    url.includes("/login") ||
    (body ?? "").includes("Sign in with Google") ||
    (body ?? "").includes("Welcome Back");
  if (isOnLoginPage) {
    testInfo.skip(true, "Admin session expired. Run:  npm run e2e:login:admin");
  }
});

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

test("@admin dashboard loads", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  await expect(page.locator("h1, h2, [class*='dashboard']").first()).toBeVisible({ timeout: 8000 });
});

test("@admin dashboard shows student list or stats", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  // Some stats cards or table should be visible
  const statsOrTable = page.locator(
    "table, [class*='stat'], [class*='card'], [class*='student']"
  );
  await expect(statsOrTable.first()).toBeVisible({ timeout: 8000 });
});

// ─── Student Management ───────────────────────────────────────────────────────

test("@admin student management page loads", async ({ page }) => {
  await page.goto("/admin/students");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

test("@admin student ID management page loads", async ({ page }) => {
  await page.goto("/admin/student-ids");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Attendance ───────────────────────────────────────────────────────────────

test("@admin attendance page loads", async ({ page }) => {
  await page.goto("/admin/attendance");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8000 });
});

// ─── Exams ────────────────────────────────────────────────────────────────────

test("@admin exams page loads", async ({ page }) => {
  await page.goto("/admin/exams");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

test("@admin exams page shows create button", async ({ page }) => {
  await page.goto("/admin/exams");
  await page.waitForLoadState("networkidle");
  // AdminExams always renders a "New Exam" button in the toolbar
  await expect(page.locator("button:has-text('New Exam')")).toBeVisible({ timeout: 10000 });
});

// ─── Fees ─────────────────────────────────────────────────────────────────────

test("@admin fees page loads", async ({ page }) => {
  await page.goto("/admin/fees");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

test("@admin fees page shows fee records or empty state", async ({ page }) => {
  await page.goto("/admin/fees");
  await page.waitForLoadState("networkidle");
  // AdminFees renders a "Fee Manager" heading with inline styles (no CSS class selectors)
  await expect(page.locator("text=Fee Manager").first()).toBeVisible({ timeout: 8000 });
});

// ─── Quotation Maker ──────────────────────────────────────────────────────────

test("@admin quotation maker page loads", async ({ page }) => {
  await page.goto("/admin/quotations");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

test("@admin quotation maker shows wizard step 1", async ({ page }) => {
  await page.goto("/admin/quotations");
  await page.waitForLoadState("networkidle");
  // Step 1 renders an h2 "Student Details" and an "Add Student" button
  const stepElement = page.locator(
    "h2:has-text('Student Details'), button:has-text('Add Student')"
  );
  await expect(stepElement.first()).toBeVisible({ timeout: 8000 });
});

test("@admin quotation maker — add a student in step 1", async ({ page }) => {
  await page.goto("/admin/quotations");
  await page.waitForLoadState("networkidle");

  // Find the "Add Student" button and click it
  const addBtn = page.locator("button:has-text('Add Student'), button:has-text('Add')").first();
  await expect(addBtn).toBeVisible({ timeout: 8000 });
  await addBtn.click();

  // A new student form appears with "Full name" placeholder
  const studentInput = page.locator("input[placeholder='Full name']").first();
  await expect(studentInput).toBeVisible({ timeout: 5000 });
  await studentInput.fill("Test Student E2E");
  await expect(studentInput).toHaveValue("Test Student E2E");
});

// ─── Rewards Admin ────────────────────────────────────────────────────────────

test("@admin rewards admin page loads", async ({ page }) => {
  await page.goto("/admin/rewards");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Access Control ───────────────────────────────────────────────────────────

test("@admin access control page loads", async ({ page }) => {
  await page.goto("/admin/access-control");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
});

// ─── Admin nav has all required links ─────────────────────────────────────────

test("@admin header shows admin nav links", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  const header = page.locator("header");
  await expect(header).toBeVisible();
  // Admin links are inside the user menu dropdown — click avatar button to open it
  await header.locator("button").filter({ has: page.locator(".rounded-full") }).first().click();
  // Dropdown should now show admin-only links
  const feeLink = header.locator("a[href='/admin/fees']");
  const quotLink = header.locator("a[href='/admin/quotations']");
  await expect(feeLink.first()).toBeVisible({ timeout: 5000 });
  await expect(quotLink.first()).toBeVisible({ timeout: 5000 });
});
