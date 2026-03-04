import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@prism/contracts": resolve(__dirname, "../../packages/contracts/src/index.ts"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**"],
  },
});
