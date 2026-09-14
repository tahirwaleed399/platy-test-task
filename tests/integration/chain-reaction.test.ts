import { describe, expect, it } from "vitest";
import { createApplication } from "../../src/composition-root.js";
import type { Assignment } from "../../src/modules/staffing/domain/assignment.js";

/**
 * THE LEGAL PATH (RFP B.4 chain reaction).
 *
 * This is the half of the demo that most candidates skip. Proving a rule can
 * fail a build is easy; proving the permitted path still works - that the rule
 * is not simply "nothing may talk to anything" - is the part that shows the
 * architecture is usable.
 *
 * Staffing confirms an assignment. It never references Docs. Docs produces the
 * checklist anyway, because it subscribes to the contract.
 *
 * RFP B.8 designates chain-reaction hooks as critical business logic requiring
 * 100% coverage - enforced in vitest.config.ts against these exact paths.
 */
const motorsportMechanic: Assignment = {
  id: "asg-001",
  personId: "person-001",
  eventId: "evt-lemans-2026",
  roles: ["mechanic"],
  sector: "motorsport",
  status: "proposed",
};

const automotiveInstructor: Assignment = {
  id: "asg-002",
  personId: "person-002",
  eventId: "evt-brand-activation-2026",
  roles: ["instructor"],
  sector: "automotive-events",
  status: "proposed",
};

describe("chain reaction: assignment confirmed -> checklist generated", () => {
  it("generates a checklist without Staffing knowing Docs exists", async () => {
    const app = createApplication();
    app.assignments.save(motorsportMechanic);

    expect(app.checklists.findByAssignmentId("asg-001")).toBeUndefined();

    await app.staffing.confirm("asg-001");

    const checklist = app.checklists.findByAssignmentId("asg-001");
    expect(checklist).toBeDefined();
    expect(checklist?.personId).toBe("person-001");
  });

  it("marks the assignment confirmed", async () => {
    const app = createApplication();
    app.assignments.save(motorsportMechanic);

    await app.staffing.confirm("asg-001");

    expect(app.assignments.findById("asg-001")?.status).toBe("confirmed");
  });

  /**
   * RFP C.3 acceptance criterion #1: "A mechanic assigned to a motorsport event
   * triggers a different checklist than an instructor assigned to an
   * automotive-events activation, even though both are freelancers."
   */
  it("produces a sector-specific checklist for the same event type", async () => {
    const app = createApplication();
    app.assignments.save(motorsportMechanic);
    app.assignments.save(automotiveInstructor);

    await app.staffing.confirm("asg-001");
    await app.staffing.confirm("asg-002");

    const motorsport = app.checklists.findByAssignmentId("asg-001");
    const automotive = app.checklists.findByAssignmentId("asg-002");

    const motorsportTypes = motorsport?.items.map((i) => i.documentType) ?? [];
    const automotiveTypes = automotive?.items.map((i) => i.documentType) ?? [];

    expect(motorsportTypes).toContain("mechanic-licence");
    expect(automotiveTypes).toContain("instructor-diploma");
    expect(motorsportTypes).not.toContain("instructor-diploma");

    // Both are freelancers, so both still carry the shared baseline.
    expect(motorsportTypes).toContain("identity-document");
    expect(automotiveTypes).toContain("identity-document");
  });

  it("rejects confirming an unknown assignment", async () => {
    const app = createApplication();
    await expect(app.staffing.confirm("does-not-exist")).rejects.toThrow(
      /Unknown assignment/,
    );
  });

  it("rejects confirming a cancelled assignment", async () => {
    const app = createApplication();
    app.assignments.save({ ...motorsportMechanic, status: "cancelled" });

    await expect(app.staffing.confirm("asg-001")).rejects.toThrow(
      /Cannot confirm cancelled/,
    );
  });

  /**
   * Phase 1b readiness: Travel (D.1) and Finance (D.2) subscribe to the SAME
   * event with no change to Staffing. This test is the evidence for that claim.
   */
  it("delivers the same event to additional subscribers without touching Staffing", async () => {
    const app = createApplication();
    app.assignments.save(motorsportMechanic);

    const travelCalls: string[] = [];
    app.eventBus.subscribe("assignment.confirmed", (event) => {
      travelCalls.push(event.assignmentId);
    });

    await app.staffing.confirm("asg-001");

    expect(travelCalls).toEqual(["asg-001"]);
    expect(app.checklists.findByAssignmentId("asg-001")).toBeDefined();
  });
});
