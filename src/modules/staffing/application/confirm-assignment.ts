import { ASSIGNMENT_CONFIRMED } from "../../../contracts/events.js";
import type { EventBus } from "../../../platform/event-bus/event-bus.js";
import { confirm } from "../domain/assignment.js";
import type { AssignmentRepository } from "../infrastructure/assignment-repository.js";

/**
 * Confirm an assignment (RFP C.1) and fire the chain reaction (RFP B.4:
 * "Staff member assigned -> automatic generation of the document checklist").
 *
 * *** THIS IS THE FILE THE DEMO BREAKS ***
 *
 * Note what is absent: any reference to the Docs module. Staffing does not
 * import it, does not call it, and does not know it exists. It publishes a fact
 * ("this assignment was confirmed") to src/contracts and stops.
 *
 * Docs subscribes to that fact. Travel (D.1) and Finance (D.2) will subscribe to
 * the same fact in Phase 1b WITHOUT this file being edited - which is the
 * property that makes module-by-module extraction possible later.
 *
 * The shortcut a developer takes at 6pm on a deadline is to import
 * docs/application/generate-checklist directly and call it. That version WORKS.
 * The feature passes its tests. What it destroys is extraction: a direct import
 * cannot cross a process boundary. Only tooling catches that, which is exactly
 * what RFP B.1 requires and why "team discipline alone is not an acceptable
 * answer".
 */
export interface ConfirmAssignmentDeps {
  readonly repository: AssignmentRepository;
  readonly eventBus: EventBus;
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
  await deps.eventBus.publish({
    type: ASSIGNMENT_CONFIRMED,
    assignmentId: confirmed.id,
    personId: confirmed.personId,
    eventId: confirmed.eventId,
    roles: confirmed.roles,
    sector: confirmed.sector,
    occurredAt: now().toISOString(),
  });
}
