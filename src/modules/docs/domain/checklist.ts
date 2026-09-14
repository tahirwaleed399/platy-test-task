import type { Sector } from "../../../contracts/events.js";

/**
 * Docs domain model (RFP C.3).
 *
 * The required-documents mapping crosses role x sector x event - never a single
 * global list (RFP C.3 business rules). Acceptance criterion C.3 #1: "A mechanic
 * assigned to a motorsport event triggers a different checklist than an
 * instructor assigned to an automotive-events activation, even though both are
 * freelancers."
 *
 * Stored as an extensible lookup, never a hard-coded enum (RFP B.3.2).
 */
export interface ChecklistItem {
  readonly documentType: string;
  readonly mandatory: boolean;
}

export interface Checklist {
  readonly assignmentId: string;
  readonly personId: string;
  readonly items: readonly ChecklistItem[];
}

const BASE_REQUIREMENTS: readonly ChecklistItem[] = [
  { documentType: "identity-document", mandatory: true },
  { documentType: "insurance", mandatory: true },
];

/** Extensible role x sector requirements. A database table in Phase 1a proper. */
const SECTOR_ROLE_REQUIREMENTS: Record<Sector, Record<string, readonly ChecklistItem[]>> = {
  motorsport: {
    mechanic: [
      { documentType: "mechanic-licence", mandatory: true },
      { documentType: "medical-certificate", mandatory: true },
    ],
    "race-engineer": [{ documentType: "series-certification", mandatory: true }],
  },
  "automotive-events": {
    instructor: [
      { documentType: "instructor-diploma", mandatory: true },
      { documentType: "driving-licence", mandatory: true },
    ],
    host: [{ documentType: "right-to-work", mandatory: true }],
  },
};

export function buildChecklist(
  assignmentId: string,
  personId: string,
  roles: readonly string[],
  sector: Sector,
): Checklist {
  const sectorRequirements = SECTOR_ROLE_REQUIREMENTS[sector];
  const roleItems = roles.flatMap((role) => sectorRequirements[role] ?? []);

  const deduped = new Map<string, ChecklistItem>();
  for (const item of [...BASE_REQUIREMENTS, ...roleItems]) {
    deduped.set(item.documentType, item);
  }

  return { assignmentId, personId, items: [...deduped.values()] };
}
