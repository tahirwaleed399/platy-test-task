import { STAFFING_TABLES } from "../../../platform/db/schema/staffing/tables.js";
import type { Assignment } from "../domain/assignment.js";

/**
 * Staffing's own persistence. This is the ONLY layer permitted to touch the
 * staffing_* schema namespace (rule R3).
 *
 * In-memory for this demo; the boundary rules are identical against a real
 * PostgreSQL client, because they match on import paths, not on runtime
 * behaviour.
 */
export class AssignmentRepository {
  readonly #rows = new Map<string, Assignment>();
  readonly table = STAFFING_TABLES.assignments;

  save(assignment: Assignment): void {
    this.#rows.set(assignment.id, assignment);
  }

  findById(id: string): Assignment | undefined {
    return this.#rows.get(id);
  }
}
