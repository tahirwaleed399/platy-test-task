import type { Sector } from "../../../contracts/events.js";

/**
 * Staffing domain model (RFP C.1).
 *
 * Rule R4 forbids domain/ from importing infrastructure/ - this file therefore
 * knows nothing about storage, and stays portable across Phase 2 extraction.
 */
export type AssignmentStatus = "proposed" | "confirmed" | "cancelled";

export interface Assignment {
  readonly id: string;
  readonly personId: string;
  readonly eventId: string;
  /** Role stacking on one person is native, not an edge case (RFP C.1). */
  readonly roles: readonly string[];
  readonly sector: Sector;
  readonly status: AssignmentStatus;
}

export function confirm(assignment: Assignment): Assignment {
  if (assignment.status === "cancelled") {
    throw new Error(`Cannot confirm cancelled assignment ${assignment.id}`);
  }
  return { ...assignment, status: "confirmed" };
}
