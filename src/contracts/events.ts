/**
 * Cross-module event contracts.
 *
 * ARCHITECTURAL SIGNIFICANCE (RFP B.1 - extraction readiness)
 * -----------------------------------------------------------
 * This file is the wire format between modules.
 *
 * In Phase 1a these events travel in-process over the event bus
 * (src/platform/event-bus). When a module is extracted to its own service in
 * Phase 2, these same payloads become the network payloads - unchanged. The bus
 * implementation is swapped for a transport (SNS/SQS, webhook per B.1); no
 * module's domain or application code changes.
 *
 * That is the whole reason cross-module calls are forced through here rather
 * than through direct imports: a direct import cannot survive a process
 * boundary, but a serialised event can.
 *
 * Therefore these types MUST remain JSON-serialisable (RFP B.1: "JSON format,
 * webhooks for cross-module events"). No class instances, no Date objects, no
 * functions - ISO 8601 strings for timestamps.
 */

/** Sector is an attribute of the account/event, never a separate app (RFP B.3.1). */
export type Sector = "motorsport" | "automotive-events";

export const ASSIGNMENT_CONFIRMED = "assignment.confirmed" as const;

/**
 * Published by Staffing when a coordinator confirms an assignment (RFP C.1).
 *
 * Chain reaction (RFP B.4): "Staff member assigned -> automatic generation of
 * the document checklist + travel plan + contract".
 *
 * Phase 1a consumers: Docs (C.3).
 * Phase 1b consumers: Travel (D.1), Finance (D.2) - they subscribe to this same
 * event without Staffing being modified, which is the point of the pattern.
 */
export interface AssignmentConfirmed {
  readonly type: typeof ASSIGNMENT_CONFIRMED;
  readonly assignmentId: string;
  readonly personId: string;
  readonly eventId: string;
  /** Roles are an extensible taxonomy, never a hard-coded enum (RFP B.3.2). */
  readonly roles: readonly string[];
  readonly sector: Sector;
  /** ISO 8601 - string, not Date, so the payload survives serialisation. */
  readonly occurredAt: string;
}

/** Every cross-module event in Phase 1a. Extended, never bypassed. */
export type DomainEvent = AssignmentConfirmed;
