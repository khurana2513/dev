# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> @admin quotation maker shows wizard step 1
- Location: e2e/admin.spec.ts:103:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h2:has-text(\'Student Details\'), button:has-text(\'Add Student\')').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('h2:has-text(\'Student Details\'), button:has-text(\'Add Student\')').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - link "BlackMonkey Logo" [ref=e7] [cursor=pointer]:
        - /url: /
        - img "BlackMonkey Logo" [ref=e9]
      - navigation [ref=e10]:
        - button "Practice" [ref=e12] [cursor=pointer]:
          - img [ref=e13]
          - text: Practice
          - img [ref=e23]
        - button "Games" [ref=e26] [cursor=pointer]:
          - img [ref=e27]
          - text: Games
          - img [ref=e29]
      - link "Sign In" [ref=e32] [cursor=pointer]:
        - /url: /login
        - button "Sign In" [ref=e33]:
          - img [ref=e34]
          - text: Sign In
  - main [ref=e36]:
    - generic [ref=e37]:
      - generic:
        - img
        - img
        - img
        - img
      - generic [ref=e38]:
        - img [ref=e42]
        - heading "Welcome Back" [level=1] [ref=e44]
        - paragraph [ref=e45]: Sign in to track your progress, earn points, and improve your mental math skills
        - generic [ref=e46]:
          - generic [ref=e47]:
            - img [ref=e50]
            - generic [ref=e53]: Progress
          - generic [ref=e55]:
            - img [ref=e58]
            - generic [ref=e60]: Practice
          - generic [ref=e62]:
            - img [ref=e65]
            - generic [ref=e67]: Secure
        - generic [ref=e71]:
          - button "Sign in with Google. Opens in new tab" [ref=e73] [cursor=pointer]:
            - generic [ref=e75]:
              - img [ref=e77]
              - generic [ref=e84]: Sign in with Google
          - iframe
        - paragraph [ref=e85]: By signing in, you agree to track your practice progress and earn points
      - button "Connection Status" [ref=e88] [cursor=pointer]:
        - generic [ref=e89]:
          - img [ref=e90]
          - generic [ref=e92]: Connection Status
        - img [ref=e93]
  - contentinfo [ref=e95]:
    - generic [ref=e96]:
      - generic [ref=e97]:
        - generic [ref=e98]:
          - link "BlackMonkey Logo BlackMonkey" [ref=e99] [cursor=pointer]:
            - /url: /
            - img "BlackMonkey Logo" [ref=e101]
            - generic [ref=e103]: BlackMonkey
          - paragraph [ref=e104]: Transforming how children learn and think through proven, structured, and genuinely engaging programs since 2008.
          - generic [ref=e105]:
            - link "📞 Call" [ref=e106] [cursor=pointer]:
              - /url: tel:+919266117055
              - img [ref=e107]
            - link "💬 WhatsApp" [ref=e109] [cursor=pointer]:
              - /url: https://wa.me/919266117055
              - img [ref=e110]
            - link "📸 Instagram" [ref=e112] [cursor=pointer]:
              - /url: https://www.instagram.com/blackmonkey
              - img [ref=e113]
            - link "📍 Directions" [ref=e116] [cursor=pointer]:
              - /url: https://share.google/FtlKId4blBwgX9Q0w
              - img [ref=e117]
        - generic [ref=e120]:
          - generic [ref=e121]: Practice
          - link "Create Papers" [ref=e122] [cursor=pointer]:
            - /url: /create
            - img [ref=e123]
            - text: Create Papers
          - link "Mental Math" [ref=e126] [cursor=pointer]:
            - /url: /mental
            - img [ref=e127]
            - text: Mental Math
          - link "Burst Mode" [ref=e137] [cursor=pointer]:
            - /url: /burst
            - img [ref=e138]
            - text: Burst Mode
        - generic [ref=e140]:
          - generic [ref=e141]: Games
          - link "Soroban Abacus" [ref=e142] [cursor=pointer]:
            - /url: /tools/soroban
            - img [ref=e143]
            - text: Soroban Abacus
          - link "Vedic Grid" [ref=e145] [cursor=pointer]:
            - /url: /tools/gridmaster
            - img [ref=e146]
            - text: Vedic Grid
          - link "Magic Square" [ref=e148] [cursor=pointer]:
            - /url: /tools/gridmaster?tab=magic
            - img [ref=e149]
            - text: Magic Square
        - generic [ref=e151]:
          - generic [ref=e152]: Branches
          - generic [ref=e153]:
            - img [ref=e154]
            - generic [ref=e157]:
              - generic [ref=e158]: Rohini Sector 16
              - generic [ref=e159]: New Delhi
          - generic [ref=e160]:
            - img [ref=e161]
            - generic [ref=e164]:
              - generic [ref=e165]: Rohini Sector 11
              - generic [ref=e166]: New Delhi
          - generic [ref=e167]:
            - img [ref=e168]
            - generic [ref=e171]:
              - generic [ref=e172]: Gurgaon
              - generic [ref=e173]: Haryana
      - generic [ref=e175]:
        - generic [ref=e176]: © 2026 BlackMonkey. Made with ❤️ & consistency.
        - generic [ref=e177]:
          - link "Privacy Policy" [ref=e178] [cursor=pointer]:
            - /url: /privacy-policy
          - link "Terms of Service" [ref=e179] [cursor=pointer]:
            - /url: /terms-of-service
          - link "About Us" [ref=e180] [cursor=pointer]:
            - /url: /about
```

# Test source

```ts
  10  | 
  11  | import { test, expect } from "@playwright/test";
  12  | import { existsSync } from "fs";
  13  | import path from "path";
  14  | 
  15  | const AUTH_FILE = path.resolve("e2e/.auth/admin.json");
  16  | 
  17  | test.beforeEach(({}, testInfo) => {
  18  |   if (!existsSync(AUTH_FILE)) {
  19  |     testInfo.skip(true, "No admin auth yet. Run:  npm run e2e:login:admin");
  20  |   }
  21  | });
  22  | 
  23  | // ─── Admin Dashboard ──────────────────────────────────────────────────────────
  24  | 
  25  | test("@admin dashboard loads", async ({ page }) => {
  26  |   await page.goto("/admin");
  27  |   await page.waitForLoadState("networkidle");
  28  |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  29  |   await expect(page.locator("h1, h2, [class*='dashboard']").first()).toBeVisible({ timeout: 8000 });
  30  | });
  31  | 
  32  | test("@admin dashboard shows student list or stats", async ({ page }) => {
  33  |   await page.goto("/admin");
  34  |   await page.waitForLoadState("networkidle");
  35  |   // Some stats cards or table should be visible
  36  |   const statsOrTable = page.locator(
  37  |     "table, [class*='stat'], [class*='card'], [class*='student']"
  38  |   );
  39  |   await expect(statsOrTable.first()).toBeVisible({ timeout: 8000 });
  40  | });
  41  | 
  42  | // ─── Student Management ───────────────────────────────────────────────────────
  43  | 
  44  | test("@admin student management page loads", async ({ page }) => {
  45  |   await page.goto("/admin/students");
  46  |   await page.waitForLoadState("networkidle");
  47  |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  48  | });
  49  | 
  50  | test("@admin student ID management page loads", async ({ page }) => {
  51  |   await page.goto("/admin/student-ids");
  52  |   await page.waitForLoadState("networkidle");
  53  |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  54  | });
  55  | 
  56  | // ─── Attendance ───────────────────────────────────────────────────────────────
  57  | 
  58  | test("@admin attendance page loads", async ({ page }) => {
  59  |   await page.goto("/admin/attendance");
  60  |   await page.waitForLoadState("networkidle");
  61  |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  62  |   await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8000 });
  63  | });
  64  | 
  65  | // ─── Exams ────────────────────────────────────────────────────────────────────
  66  | 
  67  | test("@admin exams page loads", async ({ page }) => {
  68  |   await page.goto("/admin/exams");
  69  |   await page.waitForLoadState("networkidle");
  70  |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  71  | });
  72  | 
  73  | test("@admin exams page shows create button", async ({ page }) => {
  74  |   await page.goto("/admin/exams");
  75  |   await page.waitForLoadState("networkidle");
  76  |   // AdminExams always renders a "New Exam" button in the toolbar
  77  |   await expect(page.locator("button:has-text('New Exam')")).toBeVisible({ timeout: 10000 });
  78  | });
  79  | 
  80  | // ─── Fees ─────────────────────────────────────────────────────────────────────
  81  | 
  82  | test("@admin fees page loads", async ({ page }) => {
  83  |   await page.goto("/admin/fees");
  84  |   await page.waitForLoadState("networkidle");
  85  |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  86  | });
  87  | 
  88  | test("@admin fees page shows fee records or empty state", async ({ page }) => {
  89  |   await page.goto("/admin/fees");
  90  |   await page.waitForLoadState("networkidle");
  91  |   // AdminFees renders a "Fee Manager" heading with inline styles (no CSS class selectors)
  92  |   await expect(page.locator("text=Fee Manager").first()).toBeVisible({ timeout: 8000 });
  93  | });
  94  | 
  95  | // ─── Quotation Maker ──────────────────────────────────────────────────────────
  96  | 
  97  | test("@admin quotation maker page loads", async ({ page }) => {
  98  |   await page.goto("/admin/quotations");
  99  |   await page.waitForLoadState("networkidle");
  100 |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  101 | });
  102 | 
  103 | test("@admin quotation maker shows wizard step 1", async ({ page }) => {
  104 |   await page.goto("/admin/quotations");
  105 |   await page.waitForLoadState("networkidle");
  106 |   // Step 1 renders an h2 "Student Details" and an "Add Student" button
  107 |   const stepElement = page.locator(
  108 |     "h2:has-text('Student Details'), button:has-text('Add Student')"
  109 |   );
> 110 |   await expect(stepElement.first()).toBeVisible({ timeout: 8000 });
      |                                     ^ Error: expect(locator).toBeVisible() failed
  111 | });
  112 | 
  113 | test("@admin quotation maker — add a student in step 1", async ({ page }) => {
  114 |   await page.goto("/admin/quotations");
  115 |   await page.waitForLoadState("networkidle");
  116 | 
  117 |   // Find the "Add Student" button and click it
  118 |   const addBtn = page.locator("button:has-text('Add Student'), button:has-text('Add')").first();
  119 |   await expect(addBtn).toBeVisible({ timeout: 8000 });
  120 |   await addBtn.click();
  121 | 
  122 |   // A new student form appears with "Full name" placeholder
  123 |   const studentInput = page.locator("input[placeholder='Full name']").first();
  124 |   await expect(studentInput).toBeVisible({ timeout: 5000 });
  125 |   await studentInput.fill("Test Student E2E");
  126 |   await expect(studentInput).toHaveValue("Test Student E2E");
  127 | });
  128 | 
  129 | // ─── Rewards Admin ────────────────────────────────────────────────────────────
  130 | 
  131 | test("@admin rewards admin page loads", async ({ page }) => {
  132 |   await page.goto("/admin/rewards");
  133 |   await page.waitForLoadState("networkidle");
  134 |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  135 | });
  136 | 
  137 | // ─── Access Control ───────────────────────────────────────────────────────────
  138 | 
  139 | test("@admin access control page loads", async ({ page }) => {
  140 |   await page.goto("/admin/access-control");
  141 |   await page.waitForLoadState("networkidle");
  142 |   await expect(page.locator("body")).not.toHaveText(/Something went wrong/i);
  143 | });
  144 | 
  145 | // ─── Admin nav has all required links ─────────────────────────────────────────
  146 | 
  147 | test("@admin header shows admin nav links", async ({ page }) => {
  148 |   await page.goto("/admin");
  149 |   await page.waitForLoadState("networkidle");
  150 |   const header = page.locator("header");
  151 |   await expect(header).toBeVisible();
  152 |   // Admin links are inside the user menu dropdown — click avatar button to open it
  153 |   await header.locator("button").filter({ has: page.locator(".rounded-full") }).first().click();
  154 |   // Dropdown should now show admin-only links
  155 |   const feeLink = header.locator("a[href='/admin/fees']");
  156 |   const quotLink = header.locator("a[href='/admin/quotations']");
  157 |   await expect(feeLink.first()).toBeVisible({ timeout: 5000 });
  158 |   await expect(quotLink.first()).toBeVisible({ timeout: 5000 });
  159 | });
  160 | 
```