import type { AssignmentConfirmed } from "../../../contracts/events.js";
import { buildChecklist } from "../domain/checklist.js";
import type { ChecklistRepository } from "../infrastructure/checklist-repository.js";

/**
 * Generate the document checklist for a confirmed assignment (RFP C.3).
 *
 * *** THIS IS THE FILE THE DEMO ILLEGALLY IMPORTS ***
 *
 * This handler is reached ONLY via the assignment.confirmed event. Docs does not
 * expose a function that Staffing calls; Staffing has no reference to Docs at
 * all. The dependency runs Docs -> contracts, not Docs <- Staffing.
 *
 * That inversion is what the boundary rules protect, and what makes it possible
 * to extract Docs into its own service in Phase 2 by changing only the bus.
 */
export interface GenerateChecklistDeps {
  readonly repository: ChecklistRepository;
}

export function generateChecklist(
  event: AssignmentConfirmed,
  deps: GenerateChecklistDeps,
): void {
  const checklist = buildChecklist(
    event.assignmentId,
    event.personId,
    event.roles,
    event.sector,
  );
  deps.repository.save(checklist);
}
