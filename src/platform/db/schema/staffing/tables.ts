/**
 * Staffing-owned tables. Namespace: staffing_*
 *
 * RFP B.2 mandates ONE shared database across all modules. The standing
 * objection to that on a modular monolith is that nothing stops module A
 * writing module B's tables - which would make Phase 2 extraction impossible,
 * because the data could not be split along module lines.
 *
 * Rule R3 (no-foreign-schema-access) is the enforced answer: only
 * src/modules/staffing/infrastructure/** may import this file. Shared database,
 * exclusively owned writes.
 */
export const STAFFING_TABLES = {
  assignments: "staffing_assignments",
  availability: "staffing_availability",
} as const;
