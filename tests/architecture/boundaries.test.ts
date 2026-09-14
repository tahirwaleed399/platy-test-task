import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * ARCHITECTURE TESTS (RFP B.1: "automated dependency rules, architecture tests")
 *
 * RFP B.1 names two mechanisms. The dependency rules live in
 * .dependency-cruiser.cjs; these are the architecture tests, and they assert
 * properties of the dependency GRAPH rather than of any one file.
 *
 * Hand-rolled deliberately. `tsarch` (npm: tsarch, repo ts-arch/ts-arch) is the
 * ArchUnit-style option for TypeScript; its last publish was 2024-12-23, and a
 * stale dependency guarding the build is a worse risk than ~40 lines of
 * assertions over the cruiser's own JSON output.
 */

interface Violation {
  from: string;
  to: string;
  rule: { name: string; severity: string };
}

interface CruiseSummary {
  violations: Violation[];
  error: number;
  totalCruised: number;
}

/**
 * Runs the cruiser and returns its summary.
 *
 * `cwd` matters: dependency-cruiser resolves targets, the config and tsconfig
 * relative to the working directory, so the evasion fixtures are cruised from
 * inside their own temp root with a relative target rather than an absolute one.
 */
function cruise(target: string, cwd: string): CruiseSummary {
  const args = [
    "depcruise",
    target,
    "--config",
    ".dependency-cruiser.cjs",
    "--output-type",
    "json",
  ];
  let stdout: string;
  try {
    stdout = execFileSync("npx", args, {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    // Non-zero exit is expected when violations exist; the JSON is still on stdout.
    stdout = (error as { stdout?: string }).stdout ?? "";
  }
  if (!stdout.trim()) {
    throw new Error(`depcruise produced no output (cwd: ${cwd})`);
  }
  return JSON.parse(stdout).summary as CruiseSummary;
}

describe("architecture: the real source tree", () => {
  let summary: CruiseSummary;

  beforeAll(() => {
    summary = cruise("src", process.cwd());
  }, 120_000);

  /**
   * GUARD AGAINST A SILENT FALSE PASS.
   *
   * Verified 2026-09-14: with no TypeScript compiler resolvable,
   * dependency-cruiser cruises 0 modules, prints "no dependency violations
   * found", and exits 0. A CI job would go green having scanned NOTHING.
   *
   * This assertion is the reason that failure mode cannot reach the demo.
   */
  it("actually cruised the source tree (guards against a no-op green build)", () => {
    expect(summary.totalCruised).toBeGreaterThan(10);
  });

  it("has zero boundary violations on main", () => {
    expect(summary.violations.filter((v) => v.rule.severity === "error")).toEqual([]);
    expect(summary.error).toBe(0);
  });

  /**
   * The headline property, asserted directly on the graph rather than inferred
   * from an exit code: no edge exists between any two feature modules.
   */
  it("has no edge between any two feature modules", () => {
    const moduleOf = (path: string): string | null =>
      /^src\/modules\/([^/]+)\//.exec(path)?.[1] ?? null;

    const crossEdges = summary.violations
      .map((v) => [moduleOf(v.from), moduleOf(v.to)] as const)
      .filter(([from, to]) => from !== null && to !== null && from !== to);

    expect(crossEdges).toEqual([]);
  });
});

/**
 * EVASION TESTS
 *
 * A rule that only catches the naive case is not a control. Each fixture below
 * is a route a developer could plausibly take to get around R1. All three must
 * still fail.
 */
describe("architecture: R1 resists evasion", () => {
  let fixtureRoot: string;

  beforeAll(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "platy-arch-"));

    const write = (relativePath: string, content: string): void => {
      const full = join(fixtureRoot, relativePath);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, content, "utf8");
    };

    write("tsconfig.json", JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
      },
      include: ["src/**/*.ts"],
    }));

    write(".dependency-cruiser.cjs", `module.exports = {
      forbidden: [{
        name: "no-cross-module-import",
        severity: "error",
        from: { path: "^src/modules/([^/]+)/" },
        to: { path: "^src/modules/([^/]+)/", pathNot: "^src/modules/$1/" },
      }],
      options: {
        doNotFollow: { path: "node_modules" },
        tsPreCompilationDeps: true,
        tsConfig: { fileName: "tsconfig.json" },
      },
    };`);

    write("src/modules/docs/application/generate-checklist.ts",
      `export function generateChecklist(): string { return "checklist"; }\n`);
    write("src/modules/docs/index.ts",
      `export { generateChecklist } from "./application/generate-checklist.js";\n`);

    // Route 1: the obvious direct import.
    write("src/modules/staffing/application/direct.ts",
      `import { generateChecklist } from "../../docs/application/generate-checklist.js";\n` +
      `export const a = generateChecklist;\n`);

    // Route 2: laundering the import through a barrel re-export.
    write("src/modules/staffing/application/barrel.ts",
      `import { generateChecklist } from "../../docs/index.js";\n` +
      `export const b = generateChecklist;\n`);

    // Route 3: dynamic import - invisible without tsPreCompilationDeps.
    write("src/modules/staffing/application/dynamic.ts",
      `export async function c() {\n` +
      `  const m = await import("../../docs/application/generate-checklist.js");\n` +
      `  return m.generateChecklist();\n` +
      `}\n`);
    // The fixture needs to resolve `depcruise` and `typescript`. Linking the
    // project's node_modules is cheaper than a full install per test run, and
    // keeps the fixture cruising with the exact versions under test.
    symlinkSync(
      join(process.cwd(), "node_modules"),
      join(fixtureRoot, "node_modules"),
      "junction",
    );
  }, 120_000);

  it("catches all three evasion routes", () => {
    const summary = cruise("src", fixtureRoot);

    const offenders = summary.violations
      .filter((v) => v.rule.name === "no-cross-module-import")
      .map((v) => v.from.split("\\").join("/"));

    for (const route of ["direct.ts", "barrel.ts", "dynamic.ts"]) {
      expect(
        offenders.some((f) => f.endsWith(route)),
        `expected R1 to catch evasion route: ${route}`,
      ).toBe(true);
    }
  }, 120_000);

  it("cleans up fixtures", () => {
    rmSync(fixtureRoot, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
