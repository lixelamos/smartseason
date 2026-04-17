/**
 * Crop lifecycle stages — single source of truth for the UI.
 * Must match backend `FIELD_STAGES` and Prisma `Field.currentStage` values.
 */
export const FIELD_STAGES = ['PLANTED', 'GROWING', 'READY', 'HARVESTED'] as const

export type FieldStage = (typeof FIELD_STAGES)[number]

export const FIELD_STAGE_COUNT = FIELD_STAGES.length
