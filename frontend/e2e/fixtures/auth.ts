import { test as base, Page } from "@playwright/test";

/**
 * Auth fixture — injects a real JWT into the browser's localStorage
 * and sets the user_data object so AuthContext restores the session
 * without needing to go through Google OAuth.
 *
 * HOW TO GET YOUR TOKEN:
 *  1. Log into the site in Chrome
 *  2. Open DevTools → Application → Local Storage → localhost:5173
 *  3. Copy the value of "user_data"  (it contains email, role, display_name)
 *  4. Open DevTools → Network → any authenticated API call → Headers
 *     → copy the Authorization header value (after "Bearer ")
 *  5. Create frontend/.env.test with:
 *        TEST_TOKEN=eyJ...your.access.token...
 *        TEST_USER_DATA={"id":1,"email":"you@gmail.com","role":"student","display_name":"You"}
 *        TEST_ADMIN_TOKEN=eyJ...admin.access.token...
 *        TEST_ADMIN_USER_DATA={"id":2,"email":"admin@gmail.com","role":"admin","display_name":"Admin"}
 */

const TOKEN = process.env.TEST_TOKEN ?? "";
const USER_DATA = process.env.TEST_USER_DATA ?? '{"id":0,"email":"test@example.com","role":"student","display_name":"Test User"}';
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN ?? "";
const ADMIN_USER_DATA = process.env.TEST_ADMIN_USER_DATA ?? '{"id":0,"email":"admin@example.com","role":"admin","display_name":"Admin"}';

/** Inject student auth state into the page */
async function injectStudentAuth(page: Page) {
  await page.addInitScript(
    ({ token, userData }: { token: string; userData: string }) => {
      localStorage.setItem("user_data", userData);
      // apiClient reads a module-level variable; we also set the cookie
      // so the AuthContext useEffect can restore the session
      document.cookie = `th_access_token=${token}; path=/; SameSite=Lax`;
    },
    { token: TOKEN, userData: USER_DATA }
  );
}

/** Inject admin auth state into the page */
async function injectAdminAuth(page: Page) {
  await page.addInitScript(
    ({ token, userData }: { token: string; userData: string }) => {
      localStorage.setItem("user_data", userData);
      document.cookie = `th_access_token=${token}; path=/; SameSite=Lax`;
    },
    { token: ADMIN_TOKEN, userData: ADMIN_USER_DATA }
  );
}

// Custom fixture extending base test
type AuthFixtures = {
  studentPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  studentPage: async ({ page }, use) => {
    await injectStudentAuth(page);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await injectAdminAuth(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
