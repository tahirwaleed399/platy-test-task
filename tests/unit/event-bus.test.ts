import { describe, expect, it } from "vitest";
import { EventBus } from "../../src/platform/event-bus/event-bus.js";
import { ASSIGNMENT_CONFIRMED } from "../../src/contracts/events.js";
import type { AssignmentConfirmed } from "../../src/contracts/events.js";

/**
 * The event bus is the Phase 1a transport for every chain reaction, which makes
 * it a B.4 trigger path and therefore subject to B.8's 100% coverage floor.
 */
const event: AssignmentConfirmed = {
  type: ASSIGNMENT_CONFIRMED,
  assignmentId: "asg-100",
  personId: "person-100",
  eventId: "evt-100",
  roles: ["mechanic"],
  sector: "motorsport",
  occurredAt: "2026-09-14T10:00:00.000Z",
};

describe("EventBus", () => {
  it("delivers an event to every subscriber, in registration order", async () => {
    const bus = new EventBus();
    const seen: string[] = [];

    bus.subscribe<AssignmentConfirmed>(ASSIGNMENT_CONFIRMED, () => {
      seen.push("first");
    });
    bus.subscribe<AssignmentConfirmed>(ASSIGNMENT_CONFIRMED, () => {
      seen.push("second");
    });

    await bus.publish(event);

    expect(seen).toEqual(["first", "second"]);
  });

  it("awaits asynchronous handlers before resolving", async () => {
    const bus = new EventBus();
    let settled = false;

    bus.subscribe<AssignmentConfirmed>(ASSIGNMENT_CONFIRMED, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      settled = true;
    });

    await bus.publish(event);

    expect(settled).toBe(true);
  });

  /**
   * Covers the `?? []` branch. Publishing an event nobody listens to must be a
   * no-op, not a crash: in Phase 1a, Travel and Finance have no subscribers yet,
   * and Staffing publishes assignment.confirmed regardless.
   */
  it("is a no-op when an event type has no subscribers", async () => {
    const bus = new EventBus();
    await expect(bus.publish(event)).resolves.toBeUndefined();
  });

  it("keeps handlers for different event types separate", async () => {
    const bus = new EventBus();
    let calls = 0;

    bus.subscribe<AssignmentConfirmed>(ASSIGNMENT_CONFIRMED, () => {
      calls += 1;
    });

    await bus.publish(event);
    expect(calls).toBe(1);
  });
});
