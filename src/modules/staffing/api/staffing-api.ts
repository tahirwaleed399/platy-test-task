import type { ChecklistRepository } from "../../docs/infrastructure/checklist-repository.js";
import { confirmAssignment } from "../application/confirm-assignment.js";
import { AssignmentRepository } from "../infrastructure/assignment-repository.js";

/** Staffing's outward-facing surface (RFP C.1). */
export class StaffingApi {
  constructor(
    private readonly repository: AssignmentRepository,
    private readonly checklists: ChecklistRepository,
  ) {}

  async confirm(assignmentId: string): Promise<void> {
    await confirmAssignment(assignmentId, {
      repository: this.repository,
      checklists: this.checklists,
    });
  }
}
