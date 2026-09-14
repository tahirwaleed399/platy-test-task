/**
 * Platy - module boundary rules (RFP B.1)
 *
 * "The vendor must demonstrate, in their proposal, how they intend to enforce
 *  module boundaries through tooling (automated dependency rules, architecture
 *  tests) - team discipline alone, without a technical control mechanism, is
 *  not an acceptable answer to this requirement."   - RFP B.1
 *
 * Every rule below is `severity: "error"`, so `depcruise` exits non-zero and the
 * CI job fails. The job is a REQUIRED STATUS CHECK, so the merge is blocked -
 * not merely reported red.
 *
 * NOTE ON PATH MATCHING: from.path / to.path are REGULAR EXPRESSIONS, not globs.
 * `$1` in a `to` matcher back-references the first capture group of the
 * corresponding `from` matcher - which is what lets R1 be a single rule that
 * covers every present and future module without edits.
 *
 * Verified against dependency-cruiser 18.3.0 on 2026-09-14.
 */

/** The composition root is the one place allowed to know every module. */
const COMPOSITION_ROOT = "^src/composition-root[.]ts$";

module.exports = {
  forbidden: [
    {
      name: "no-cross-module-import",
      comment:
        "R1 (RFP B.1 - extraction readiness). A module may not import another " +
        "module. Cross-module communication goes through src/contracts events " +
        "on the platform event bus. A direct import cannot survive a process " +
        "boundary; a serialised event can - so this rule is what keeps " +
        "module-by-module extraction to microservices possible in Phase 2 " +
        "without a rewrite. The composition root is exempt: something must " +
        "assemble the application, and naming one exemption is what keeps the " +
        "rule meaningful.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/", pathNot: COMPOSITION_ROOT },
      to: { path: "^src/modules/([^/]+)/", pathNot: "^src/modules/$1/" },
    },
    {
      name: "no-platform-or-contracts-to-module",
      comment:
        "R2 (dependency direction). platform/ and contracts/ are the stable " +
        "core: modules depend on them, never the reverse. If contracts/ " +
        "imported a module, the wire format would carry that module's code " +
        "into every other module - and extraction would be impossible.",
      severity: "error",
      from: { path: "^src/(platform|contracts)/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "no-foreign-schema-access",
      comment:
        "R3 (RFP B.2 - shared model, owned writes). RFP B.2 mandates ONE " +
        "shared database. The standing objection to a modular monolith on a " +
        "shared database is that nothing stops module A writing module B's " +
        "tables - after which the data cannot be split along module lines and " +
        "Phase 2 extraction is dead. Only a module's own infrastructure/ layer " +
        "may import its schema namespace. Shared database, exclusively owned " +
        "writes.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/platform/db/schema/([^/]+)/",
        pathNot: "^src/platform/db/schema/$1/",
      },
    },
    {
      name: "no-schema-access-outside-infrastructure",
      comment:
        "R3b. Even inside its OWN module, only infrastructure/ may touch the " +
        "schema. Keeps persistence out of domain/ and application/, so the " +
        "business logic stays portable.",
      severity: "error",
      from: {
        path: "^src/modules/[^/]+/(domain|application|api)/",
      },
      to: { path: "^src/platform/db/schema/" },
    },
    {
      name: "no-domain-to-infrastructure",
      comment:
        "R4 (keeps the domain portable). A module's domain/ layer may not " +
        "import its own infrastructure/. Business rules must not depend on " +
        "storage, transport, or framework choices - this is what makes the " +
        "domain testable without a database and movable in Phase 2.",
      severity: "error",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: { path: "^src/modules/[^/]+/infrastructure/" },
    },
    {
      name: "no-circular-dependencies",
      comment:
        "A dependency cycle means the two ends cannot be extracted " +
        "independently, whatever the folder layout says.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphan-contracts",
      comment:
        "An event contract nothing publishes or consumes is dead wire format. " +
        "Informational - it signals drift rather than breaking the build.",
      severity: "info",
      from: { orphan: true, path: "^src/contracts/" },
      to: {},
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },

    /**
     * LOAD-BEARING, NOT COSMETIC.
     *
     * With tsPreCompilationDeps disabled, a dynamic `await import("../../docs/...")`
     * is invisible to the cruiser and R1 is trivially bypassed. Verified on
     * 2026-09-14: with this flag on, direct imports, barrel re-exports AND
     * dynamic imports are all caught. See tests/architecture/boundaries.test.ts,
     * which asserts each of those three evasion routes is still detected.
     */
    tsPreCompilationDeps: true,

    tsConfig: { fileName: "tsconfig.json" },

    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
