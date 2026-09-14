import { DOCS_TABLES } from "../../../platform/db/schema/docs/tables.js";
import type { Checklist } from "../domain/checklist.js";

/**
 * Docs' own persistence - the only layer permitted to touch the docs_* schema
 * namespace (rule R3).
 */
export class ChecklistRepository {
  readonly #rows = new Map<string, Checklist>();
  readonly table = DOCS_TABLES.checklists;

  save(checklist: Checklist): void {
    this.#rows.set(checklist.assignmentId, checklist);
  }

  findByAssignmentId(assignmentId: string): Checklist | undefined {
    return this.#rows.get(assignmentId);
  }
}
