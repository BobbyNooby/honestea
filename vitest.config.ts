import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Pure logic only — packages/shared. App code imports expo/RN modules
    // that don't load in a node environment; UI paths are verified by
    // typecheck + manual matrix (see the plan doc).
    include: ["packages/**/*.test.ts"],
    environment: "node",
  },
})
