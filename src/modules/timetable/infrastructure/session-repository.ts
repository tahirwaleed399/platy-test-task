import { TIMETABLE_TABLES } from "../../../platform/db/schema/timetable/tables.js";
import type { Session } from "../domain/session.js";

/** Only layer permitted to touch the timetable_* schema namespace (rule R3). */
export class SessionRepository {
  readonly #rows = new Map<string, Session>();
  readonly table = TIMETABLE_TABLES.sessions;

  save(session: Session): void {
    this.#rows.set(session.id, session);
  }

  findById(id: string): Session | undefined {
    return this.#rows.get(id);
  }
}
