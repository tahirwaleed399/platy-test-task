import { defineConfig } from "vitest/config";

/**
 * RFP B.8 coverage requirement:
 *   "Target unit test coverage: 80% on module business logic (Parts C and D) -
 *    chain-reaction hooks (B.4) are considered critical business logic, with a
 *    minimum expected coverage of 100% on those specific triggers."
 *
 * Both thresholds are enforced here, the 100% one scoped by path to the
 * chain-reaction trigger files rather than applied globally - a blanket 100%
 * would force tests for wiring code and buy nothing.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 120_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/api/**", "src/composition-root.ts"],
      thresholds: {
        // RFP B.8: 80% on module business logic.
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,

        // RFP B.8: 100% on chain-reaction triggers (B.4).
        "src/modules/staffing/application/confirm-assignment.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/modules/docs/application/generate-checklist.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/platform/event-bus/event-bus.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
});
