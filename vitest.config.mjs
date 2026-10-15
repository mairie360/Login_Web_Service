import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import coverageScope from "./scripts/coverage-scope.cjs";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      include: ["src/**/*.tsx", ...coverageScope.reactSources],
      reportsDirectory: "coverage/components",
      reporter: ["text", "lcov", "json-summary"],
      thresholds: { lines: 60, branches: 60, functions: 60, statements: 60, perFile: { lines: 60 } },
    },
    include: ["tests/component/**/*.test.jsx"],
    setupFiles: ["./tests/component/setup.js"],
    clearMocks: true,
  },
});
