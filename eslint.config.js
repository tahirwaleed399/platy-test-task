/**
 * Editor-time boundary feedback.
 *
 * This is deliberately NOT the enforcement mechanism - CI is (see
 * .dependency-cruiser.cjs and .github/workflows/architecture.yml). ESLint runs
 * in the developer's editor and tells them at the keyboard, ~30 seconds after
 * they write the bad import, rather than ~3 minutes later in CI.
 *
 * Two layers, deliberately:
 *   - the editor WARNS, and can be silenced by a developer in a hurry
 *   - CI BLOCKS, and cannot (the rules config is CODEOWNER-protected)
 *
 * `no-restricted-imports` with zoned patterns covers the same ground as
 * eslint-plugin-boundaries here without the extra dependency. It is a
 * convenience, not a control: it only sees static import specifiers, so it
 * misses the dynamic-import route that dependency-cruiser catches.
 */
export default [
  {
    files: ["src/modules/*/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["**/modules/*/**"],
              message:
                "R1: no cross-module imports. Publish an event from src/contracts instead - see src/modules/staffing/application/confirm-assignment.ts.",
            },
            {
              group: ["**/platform/db/schema/**"],
              message:
                "R3: only a module's own infrastructure/ layer may touch a schema namespace.",
            },
          ],
        },
      ],
    },
  },
  {
    // Within a module, infrastructure/ is the layer that OWNS schema access.
    files: ["src/modules/*/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["**/modules/*/**"],
              message:
                "R1: no cross-module imports. Publish an event from src/contracts instead.",
            },
          ],
        },
      ],
    },
  },
];
