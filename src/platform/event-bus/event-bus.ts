import type { DomainEvent } from "../../contracts/events.js";

/**
 * In-process event bus - the Phase 1a transport for cross-module communication.
 *
 * PHASE 2 EXTRACTION: this implementation is the ONLY thing that changes when a
 * module becomes a service. Publishers and subscribers keep their code; this
 * class starts writing to SNS/SQS or posting webhooks (RFP B.1) instead of
 * calling local handlers. Because handlers already receive plain serialisable
 * contracts (src/contracts/events.ts), nothing downstream notices.
 *
 * NOTE (RFP B.4bis): circuit-breaker + manual override for mass-effect triggers
 * is a real Phase 1a requirement. It belongs at this layer. Out of scope for
 * this boundary demo, which exists to prove enforcement, not to build Phase 1a.
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;

export class EventBus {
  readonly #handlers = new Map<string, EventHandler[]>();

  subscribe<T extends DomainEvent>(type: T["type"], handler: EventHandler<T>): void {
    const existing = this.#handlers.get(type) ?? [];
    existing.push(handler as EventHandler);
    this.#handlers.set(type, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.#handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }
}
