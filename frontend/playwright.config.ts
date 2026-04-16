import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

/**
 * Playwright E2E Configuration
 *
 * ─── FIRST-TIME SETUP ──────────────────────────────────────────────────────
 *
 *  1. Start the dev server in a separate terminal:
 *       npm run dev
 *
 *  2. Save your logged-in sessions (one-time, re-run when token expires ~30 days):
 *       npm run e2e:login:student   ← opens Chrome → click Google Sign-In → close
 *       npm run e2e:login:admin     ← same, but log in with your ADMIN account
 *
 *  3. Run tests:
 *       npm run e2e:public          ← no login needed, runs immediately
 *       npm run e2e:student         ← needs e2e/.auth/student.json
 *       npm run e2e:admin           ← needs e2e/.auth/admin.json
 *       npm run e2e:report          ← open HTML report with screenshots & video
 *
 *  To test against production instead of localhost:
 *       PLAYWRIGHT_BASE_URL=https://hi-test.up.railway.app npm run e2e:public
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const IS_LOCAL = BASE_URL.startsWith("http://localhost");

const STUDENT_AUTH = path.resolve("e2e/.auth/student.json");
const ADMIN_AUTH   = path.resolve("e2e/.auth/admin.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // ── Public pages — no auth needed ──────────────────────────────────────
    {
      name: "public",
      testMatch: "**/public.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public-mobile",
      testMatch: "**/public.spec.ts",
      use: { ...devices["Pixel 5"] },
    },

    // ── Student — requires e2e/.auth/student.json ──────────────────────────
    // Run:  npm run e2e:login:student  (first time)
    // Uses real Chrome (channel: 'chrome') so Google OAuth doesn't block the
    // automated browser with "This browser or app may not be secure".
    {
      name: "student",
      testMatch: "**/student.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        launchOptions: {
          args: ["--disable-blink-features=AutomationControlled"],
        },
        ...(existsSync(STUDENT_AUTH) ? { storageState: STUDENT_AUTH } : {}),
      },
    },

    // ── Admin — requires e2e/.auth/admin.json ──────────────────────────────
    // Run:  npm run e2e:login:admin  (first time)
    {
      name: "admin",
      testMatch: "**/admin.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        launchOptions: {
          args: ["--disable-blink-features=AutomationControlled"],
        },
        ...(existsSync(ADMIN_AUTH) ? { storageState: ADMIN_AUTH } : {}),
      },
    },
  ],

  // Only auto-start dev server when testing against localhost.
  // If PLAYWRIGHT_BASE_URL points to production, skip webServer entirely.
  ...(IS_LOCAL
    ? {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000",
          // If the dev server is already running (e.g. in another terminal),
          // reuse it instead of starting a new one.
          reuseExistingServer: true,
          stdout: "pipe",
          stderr: "pipe",
          timeout: 60_000,
        },
      }
    : {}),
});
