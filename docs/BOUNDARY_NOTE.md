# Module boundaries: how they are enforced, and what they buy in Phase 2

*Accompanies the boundary demo repository. RFP B.1, B.2, B.4.*

---

## The rules, and what each one answers

| # | Rule | RFP | What it prevents |
|---|---|---|---|
| **R1** | No `modules/X` may import `modules/Y` | B.1 | The shortcut that makes extraction impossible |
| **R2** | `platform/` and `contracts/` may not import `modules/` | B.1 | The stable core acquiring feature dependencies |
| **R3** | Only a module's own `infrastructure/` may touch its DB schema namespace | B.2 | Module A writing module B's tables |
| **R3b** | Even inside a module, only `infrastructure/` touches schema | B.2 | Persistence leaking into business logic |
| **R4** | `domain/` may not import `infrastructure/` | B.1 | A domain model welded to one storage choice |
| **R5** | Chain reactions travel only via `contracts/` events | B.4 | Hidden synchronous coupling between modules |

All rules run as `severity: error`, so the checker exits non-zero, the `architecture` job fails, and — because that job is a required status check — **the merge is blocked**. "CI is red" and "the merge is blocked" are different claims; this is the second.

---

## On R5, stated precisely

`dependency-cruiser` analyses imports, not runtime message flows. It cannot literally observe that a chain reaction travelled over an event, and we would rather say so than imply a rule inspects something it does not.

What it can do is eliminate every alternative. Once R1 holds, no module can reach another module's code at all, so `contracts/` plus the event bus is the only remaining route between modules. R5 is enforced **negatively**, as a consequence of R1 — and the integration test then proves the permitted route actually carries real work.

That test is the half of the demo that matters: it shows the rules permit the architecture rather than merely forbidding things.

---

## Why R3 is not optional

RFP B.2 mandates a single shared database across all modules. The standing objection to a modular monolith on shared storage is straightforward:

> Nothing stops module A writing module B's tables. Once that has happened in a hundred places, the data cannot be separated along module lines, and the monolith is permanent regardless of how the folders are arranged.

R3 is the pre-emptive answer, and it is enforced rather than documented. Each module owns a schema namespace — `staffing_*`, `timetable_*`, `docs_*` — that only its own `infrastructure/` layer may import. Shared database (B.2 satisfied), exclusively owned writes (extraction preserved).

Cross-module reads go through events or an owning module's API, never a direct table read. We have flagged one open question on this — whether a read-only view across module tables would be acceptable to CAPPI SIM — since it changes how strictly R3 is drawn.

---

## How extraction happens in Phase 2

`src/contracts/` is the wire format. This is the point of the whole arrangement.

Today, `assignment.confirmed` is published by Staffing and delivered in-process to Docs by the platform event bus. The payload is a plain JSON-serialisable object — no class instances, no `Date`s, ISO 8601 strings — because it is already designed to survive a network hop.

When load in Phase 1b justifies extracting Docs into its own service:

1. The bus implementation is replaced with a transport — SNS/SQS, or webhooks per B.1.
2. Docs subscribes over that transport instead of in-process.
3. **The payload does not change. Staffing does not change. The domain logic does not change.**

The event Staffing already publishes becomes the network payload, unchanged. That is what "extracted module by module if and when real load justifies it" requires in practice, and it is only available if nothing ever bypassed the contract — which is what R1 guarantees for every commit, not just the ones that got a careful review.

The test suite carries the evidence: a second subscriber, standing in for Travel (D.1), receives the same event with no modification to Staffing. In the illegal commit, that test fails.

---

## Tooling

**`dependency-cruiser` 18.3.0** for the dependency rules; **hand-rolled assertions in the existing test runner** for the architecture tests. B.1 names both mechanisms and this ships both.

Also evaluated:

- **`tsarch`** — the ArchUnit-style option for TypeScript. Last published December 2024; a stale dependency guarding the build is a worse risk than roughly forty lines of assertions over the cruiser's own JSON output.
- **Nx tag-based boundaries** — effective, but adopting Nx to obtain one lint rule imposes a monorepo toolchain the project does not otherwise need.
- **TypeScript project references** — genuine compile-time enforcement, but harder to work with day to day and it cannot express R3 at all.
- **ESLint `no-restricted-imports`** — included as an editor-time net so developers are told at the keyboard rather than three minutes later in CI. It is a convenience, not the control: it sees only static import specifiers.

Two layers, deliberately: the editor warns and can be silenced; CI blocks and cannot, because the rules config is CODEOWNER-protected.

---

## Two findings from verification

**1 · A silent false pass.** With no resolvable TypeScript compiler, `dependency-cruiser` cruises zero modules, reports no violations, and exits 0 — a green build that scanned nothing. Both CI and an architecture test now assert the checker actually saw the tree. A control that can silently no-op is worse than no control, because it manufactures confidence.

**2 · Dynamic imports need an explicit option.** Without `tsPreCompilationDeps`, `await import("../../docs/…")` is invisible and R1 is trivially bypassed. The architecture tests assert that all three evasion routes — direct import, barrel re-export, dynamic import — are still caught, so this cannot regress silently.

Both were found by testing the tooling rather than trusting it. We would rather surface them than present a demo that happens to work.

---

## Also covered in the same artefact

- **B.8 — senior review on every PR.** `CODEOWNERS` covers the rules config, the workflow, the architecture tests and the coverage thresholds. Relaxing a boundary rule requires senior approval, enforced by the platform rather than promised in a process document.
- **B.8 — 100% coverage on chain-reaction hooks.** Thresholds are scoped by path to the B.4 trigger files, with the 80% general floor applied alongside.
- **B.9 — CI on every pull request.** The `architecture` job runs on `pull_request`.
- **C.3 §1 — sector-specific checklists.** A motorsport mechanic and an automotive-events instructor produce different checklists from the same code path, asserted in the integration test.
