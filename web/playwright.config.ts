import { defineConfig, devices } from "@playwright/test"

const PORT = 3000
const SUPABASE_MOCK_PORT = 54321

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: `http://127.0.0.1:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      SITE_URL: `http://127.0.0.1:${PORT}`,
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SUPABASE_MOCK_PORT}`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:18080/api/v1",
    },
  },
})
