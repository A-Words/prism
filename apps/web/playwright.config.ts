import { defineConfig } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
  },
  webServer: {
    command: "bun run dev",
    cwd: here,
    port: 5173,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
