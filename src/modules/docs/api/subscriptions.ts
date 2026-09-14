import { ASSIGNMENT_CONFIRMED } from "../../../contracts/events.js";
import type { AssignmentConfirmed } from "../../../contracts/events.js";
import type { EventBus } from "../../../platform/event-bus/event-bus.js";
import { generateChecklist } from "../application/generate-checklist.js";
import type { ChecklistRepository } from "../infrastructure/checklist-repository.js";

/**
 * Docs' inbound edge. Docs declares what it listens to; Staffing is never
 * modified to add a consumer.
 *
 * In Phase 2 this becomes an HTTP/queue subscription instead of an in-process
 * one. The handler signature does not change.
 */
export function registerDocsSubscriptions(
  eventBus: EventBus,
  repository: ChecklistRepository,
): void {
  eventBus.subscribe<AssignmentConfirmed>(ASSIGNMENT_CONFIRMED, (event) => {
    generateChecklist(event, { repository });
  });
}
