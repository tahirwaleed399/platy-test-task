import { generateChecklist } from "../../docs/application/generate-checklist.js";
import type { ChecklistRepository } from "../../docs/infrastructure/checklist-repository.js";
import { confirm } from "../domain/assignment.js";
import type { AssignmentRepository } from "../infrastructure/assignment-repository.js";

/**
 * Confirm an assignment and generate the document checklist.
 *
 * Calling Docs directly here - the event bus indirection was making this hard
 * to follow, and the checklist has to exist the moment the assignment is
 * confirmed anyway. Fewer moving parts, and the integration test still passes.
 */
export interface ConfirmAssignmentDeps {
  readonly repository: AssignmentRepository;
  readonly checklists: ChecklistRepository;
  readonly now?: () => Date;
}

export async function confirmAssignment(
  assignmentId: string,
  deps: ConfirmAssignmentDeps,
): Promise<void> {
  const existing = deps.repository.findById(assignmentId);
  if (!existing) {
    throw new Error(`Unknown assignment ${assignmentId}`);
  }

  const confirmed = confirm(existing);
  deps.repository.save(confirmed);

  const now = deps.now ?? (() => new Date());
  generateChecklist(
    {
      type: "assignment.confirmed",
      assignmentId: confirmed.id,
      personId: confirmed.personId,
      eventId: confirmed.eventId,
      roles: confirmed.roles,
      sector: confirmed.sector,
      occurredAt: now().toISOString(),
    },
    { repository: deps.checklists },
  );
}
