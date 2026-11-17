import { defineConfig, devices } from "@playwright/test";

// End-to-end checks against the dev server that is already running on :3000.
// Run: npx playwright test --reporter=line
export default defineConfig({
  testDir: "./tests/e2e",
  // Keep Playwright's own artefacts in a sub-folder so the screenshots in test-results/e2e-shots survive a rerun.
  outputDir: "test-results/playwright",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [["line"]],
  use: {
    // E2E_BASE_URL lets the same suite check a production build (npm run build && npx next start -p 3100).
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    // Every /api/agent call gets the scripted reply (app/api/agent/route.ts): deterministic, and no Groq/Gemini quota used.
    extraHTTPHeaders: { "x-shadowday-scripted": "1" },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "iphone-15",
      use: { ...devices["iPhone 15"] },
    },
  ],
});
