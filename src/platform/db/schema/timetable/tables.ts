/**
 * Timetable-owned tables. Namespace: timetable_*
 * Only src/modules/timetable/infrastructure/** may import this file (rule R3).
 */
export const TIMETABLE_TABLES = {
  sessions: "timetable_sessions",
  publications: "timetable_publications",
} as const;
