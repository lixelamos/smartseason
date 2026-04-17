import type { Field, FieldUpdate, User } from "@prisma/client";
import { computeFieldStatus } from "../lib/status";

export type FieldWithRelations = Field & {
  assignedAgent: Pick<User, "id" | "name" | "email"> | null;
  updates: (FieldUpdate & {
    author?: Pick<User, "id" | "name" | "role"> | null;
  })[];
};

export function presentField(field: FieldWithRelations) {
  const status = computeFieldStatus(field);
  return {
    id: field.id,
    name: field.name,
    cropType: field.cropType,
    plantingDate: field.plantingDate.toISOString(),
    currentStage: field.currentStage,
    status,
    assignedAgent: field.assignedAgent
      ? {
          id: field.assignedAgent.id,
          name: field.assignedAgent.name,
          email: field.assignedAgent.email,
        }
      : null,
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
  };
}

export function presentFieldDetail(field: FieldWithRelations) {
  const base = presentField(field);
  const updates = field.updates
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((u) => {
      const author =
        "author" in u && u.author
          ? { id: u.author.id, name: u.author.name, role: u.author.role }
          : { id: u.authorId, name: "Unknown", role: "FIELD_AGENT" as const };
      return {
        id: u.id,
        stage: u.stage,
        note: u.note,
        createdAt: u.createdAt.toISOString(),
        authorId: u.authorId,
        author,
      };
    });
  return { ...base, updates };
}
