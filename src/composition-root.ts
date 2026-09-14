import { EventBus } from "./platform/event-bus/event-bus.js";
import { registerDocsSubscriptions } from "./modules/docs/api/subscriptions.js";
import { ChecklistRepository } from "./modules/docs/infrastructure/checklist-repository.js";
import { AssignmentRepository } from "./modules/staffing/infrastructure/assignment-repository.js";
import { StaffingApi } from "./modules/staffing/api/staffing-api.js";

/**
 * Composition root - the ONE place permitted to know every module, because
 * wiring is not a module.
 *
 * This file is explicitly exempted from rule R1 (see .dependency-cruiser.cjs).
 * Without that exemption the rules would be unsatisfiable: something must
 * assemble the application. Naming the single exemption, rather than loosening
 * R1 for everyone, is what keeps the rule meaningful.
 *
 * In Phase 2 this splits into one composition root per extracted service.
 */
export interface Application {
  readonly staffing: StaffingApi;
  readonly checklists: ChecklistRepository;
  readonly assignments: AssignmentRepository;
  readonly eventBus: EventBus;
}

export function createApplication(): Application {
  const eventBus = new EventBus();

  const assignments = new AssignmentRepository();
  const checklists = new ChecklistRepository();

  registerDocsSubscriptions(eventBus, checklists);

  return {
    staffing: new StaffingApi(assignments, eventBus),
    checklists,
    assignments,
    eventBus,
  };
}
