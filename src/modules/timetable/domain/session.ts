import type { Sector } from "../../../contracts/events.js";

/**
 * Timetable domain model (RFP C.2).
 *
 * Present so the boundary graph reflects all three Phase 1a modules. The
 * schedule-change chain reaction (C.2 -> C.1) is Phase 1a build work, not part
 * of this enforcement demo.
 */
export interface Session {
  readonly id: string;
  readonly eventId: string;
  readonly name: string;
  readonly startsAt: string;
  readonly sector: Sector;
}

/** Anchored events keep relative position when a session moves (RFP C.2). */
export function shiftSession(session: Session, offsetMinutes: number): Session {
  const shifted = new Date(
    new Date(session.startsAt).getTime() + offsetMinutes * 60_000,
  );
  return { ...session, startsAt: shifted.toISOString() };
}
