import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use "node" so lib tests run without jsdom. For React component tests, install jsdom and set environment to "jsdom".
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/components/**/*.test.tsx"],
    globals: true,
    cache: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
