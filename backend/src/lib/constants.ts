export const ROLES = {
  ADMIN: "ADMIN",
  FIELD_AGENT: "FIELD_AGENT",
} as const;

/** Ordered lifecycle (4 stages). Keep in sync with `frontend/src/lib/fieldStages.ts`. */
export const FIELD_STAGES = [
  "PLANTED",
  "GROWING",
  "READY",
  "HARVESTED",
] as const;

export const FIELD_STAGE_COUNT = FIELD_STAGES.length;

export type FieldStage = (typeof FIELD_STAGES)[number];

export const FIELD_STATUS = {
  ACTIVE: "ACTIVE",
  AT_RISK: "AT_RISK",
  COMPLETED: "COMPLETED",
} as const;

export type FieldStatus = (typeof FIELD_STATUS)[keyof typeof FIELD_STATUS];
