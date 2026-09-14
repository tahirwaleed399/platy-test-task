/**
 * Docs-owned tables. Namespace: docs_*
 * Only src/modules/docs/infrastructure/** may import this file (rule R3).
 */
export const DOCS_TABLES = {
  checklists: "docs_checklists",
  documents: "docs_documents",
} as const;
