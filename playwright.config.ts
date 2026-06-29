import { defineConfig, devices } from "@playwright/test";

// End-to-end: drive the real built/dev app across representative form factors.
// Mobile-first — phones in both orientations, a tablet, and a desktop fallback.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "phone-portrait", use: { ...devices["Pixel 7"] } },
    {
      name: "phone-landscape",
      use: { ...devices["Pixel 7 landscape"] },
    },
    { name: "foldable-unfolded-portrait", use: { ...devices["Galaxy Z Fold 6"] } },
    {
      name: "foldable-unfolded-landscape",
      use: { ...devices["Galaxy Z Fold 6 landscape"] },
    },
    { name: "tablet", use: { ...devices["iPad Pro 11"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
