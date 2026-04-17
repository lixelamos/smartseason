import type { Field, FieldUpdate } from "@prisma/client";
import { FIELD_STATUS, type FieldStatus, type FieldStage } from "./constants";

type FieldWithUpdates = Field & { updates: Pick<FieldUpdate, "createdAt">[] };

const MS_PER_DAY = 86_400_000;

function lastActivityAt(field: FieldWithUpdates): Date {
  const fromUpdates = field.updates.map((u) => u.createdAt.getTime());
  const maxUpdate = fromUpdates.length ? Math.max(...fromUpdates) : 0;
  return new Date(Math.max(field.updatedAt.getTime(), field.createdAt.getTime(), maxUpdate));
}

/**
 * COMPLETED: lifecycle finished (harvested).
 * AT_RISK: still in-season but monitoring has gone stale, or crop sits ready too long.
 * ACTIVE: default in-season state.
 */
export function computeFieldStatus(field: FieldWithUpdates): FieldStatus {
  const stage = field.currentStage as FieldStage;

  if (stage === "HARVESTED") {
    return FIELD_STATUS.COMPLETED;
  }

  const now = Date.now();
  const last = lastActivityAt(field).getTime();
  const daysSinceActivity = (now - last) / MS_PER_DAY;

  if (daysSinceActivity >= 14) {
    return FIELD_STATUS.AT_RISK;
  }

  const daysSincePlanting = (now - field.plantingDate.getTime()) / MS_PER_DAY;
  if (stage === "READY" && daysSincePlanting >= 120) {
    return FIELD_STATUS.AT_RISK;
  }

  return FIELD_STATUS.ACTIVE;
}
