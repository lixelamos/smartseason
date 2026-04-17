import { Router, type Request } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ROLES, FIELD_STAGES } from "../lib/constants";
import { authRequired, requireAdmin } from "../middleware/auth";
import { presentField, presentFieldDetail, type FieldWithRelations } from "../services/fieldPresenter";

const router = Router();

function fieldId(req: Request): string {
  const v = req.params.id;
  return Array.isArray(v) ? v[0]! : v;
}

const fieldInclude = {
  assignedAgent: { select: { id: true, name: true, email: true } },
  updates: {
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  },
} as const;

function canAccessField(
  role: string,
  userId: string,
  field: { assignedAgentId: string | null },
): boolean {
  if (role === ROLES.ADMIN) return true;
  return field.assignedAgentId === userId;
}

router.use(authRequired);

router.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const role = req.user!.role;

  const where =
    role === ROLES.ADMIN
      ? {}
      : {
          assignedAgentId: userId,
        };

  const rows = await prisma.field.findMany({
    where,
    include: fieldInclude,
    orderBy: { updatedAt: "desc" },
  });

  res.json(rows.map((f) => presentField(f as FieldWithRelations)));
});

router.get("/:id", async (req, res) => {
  const field = await prisma.field.findUnique({
    where: { id: fieldId(req) },
    include: fieldInclude,
  });
  if (!field) {
    res.status(404).json({ error: "Field not found" });
    return;
  }
  if (!canAccessField(req.user!.role, req.user!.sub, field)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(presentFieldDetail(field as FieldWithRelations));
});

const createSchema = z.object({
  name: z.string().min(1),
  cropType: z.string().min(1),
  plantingDate: z.string().min(1),
  currentStage: z.enum(FIELD_STAGES).optional(),
  assignedAgentId: z.string().cuid().nullable().optional(),
});

router.post("/", requireAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  if (body.assignedAgentId) {
    const agent = await prisma.user.findFirst({
      where: { id: body.assignedAgentId, role: ROLES.FIELD_AGENT },
    });
    if (!agent) {
      res.status(400).json({ error: "Invalid field agent" });
      return;
    }
  }
  const planted = new Date(body.plantingDate);
  if (Number.isNaN(planted.getTime())) {
    res.status(400).json({ error: "Invalid plantingDate" });
    return;
  }
  const field = await prisma.field.create({
    data: {
      name: body.name,
      cropType: body.cropType,
      plantingDate: planted,
      currentStage: body.currentStage ?? "PLANTED",
      assignedAgentId: body.assignedAgentId ?? null,
    },
    include: fieldInclude,
  });
  res.status(201).json(presentField(field as FieldWithRelations));
});

const patchAdminSchema = z.object({
  name: z.string().min(1).optional(),
  cropType: z.string().min(1).optional(),
  plantingDate: z.string().min(1).optional(),
  currentStage: z.enum(FIELD_STAGES).optional(),
  assignedAgentId: z.string().cuid().nullable().optional(),
});

router.patch("/:id", async (req, res) => {
  const field = await prisma.field.findUnique({ where: { id: fieldId(req) } });
  if (!field) {
    res.status(404).json({ error: "Field not found" });
    return;
  }

  if (req.user!.role === ROLES.ADMIN) {
    const parsed = patchAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    if (body.assignedAgentId) {
      const agent = await prisma.user.findFirst({
        where: { id: body.assignedAgentId, role: ROLES.FIELD_AGENT },
      });
      if (!agent) {
        res.status(400).json({ error: "Invalid field agent" });
        return;
      }
    }
    const data: Prisma.FieldUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.cropType !== undefined) data.cropType = body.cropType;
    if (body.plantingDate !== undefined) {
      const d = new Date(body.plantingDate);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ error: "Invalid plantingDate" });
        return;
      }
      data.plantingDate = d;
    }
    if (body.currentStage !== undefined) data.currentStage = body.currentStage;
    if ("assignedAgentId" in body) data.assignedAgentId = body.assignedAgentId;

    const updated = await prisma.field.update({
      where: { id: field.id },
      data,
      include: fieldInclude,
    });
    res.json(presentField(updated as FieldWithRelations));
    return;
  }

  if (field.assignedAgentId !== req.user!.sub) {
    res.status(403).json({ error: "You can only edit assigned fields" });
    return;
  }

  res.status(403).json({
    error: "Field agents should add observations via POST /fields/:id/updates",
  });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = fieldId(req);
  const existing = await prisma.field.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Field not found" });
    return;
  }
  await prisma.field.delete({ where: { id } });
  res.status(204).send();
});

const updateSchema = z.object({
  stage: z.enum(FIELD_STAGES).optional(),
  note: z.string().min(1).optional(),
});

router.post("/:id/updates", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { stage, note } = parsed.data;
  if (stage === undefined && note === undefined) {
    res.status(400).json({ error: "Provide stage and/or note" });
    return;
  }

  const field = await prisma.field.findUnique({ where: { id: fieldId(req) } });
  if (!field) {
    res.status(404).json({ error: "Field not found" });
    return;
  }
  if (!canAccessField(req.user!.role, req.user!.sub, field)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data: { currentStage?: string } = {};
    if (stage !== undefined) {
      data.currentStage = stage;
    }
    const f = await tx.field.update({
      where: { id: field.id },
      data,
      include: fieldInclude,
    });
    await tx.fieldUpdate.create({
      data: {
        fieldId: field.id,
        authorId: req.user!.sub,
        stage: stage ?? null,
        note: note ?? null,
      },
    });
    return tx.field.findUniqueOrThrow({
      where: { id: f.id },
      include: fieldInclude,
    });
  });

  res.status(201).json(presentFieldDetail(updated as FieldWithRelations));
});

export default router;
