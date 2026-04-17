import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ROLES } from "../lib/constants";
import { authRequired } from "../middleware/auth";
import { computeFieldStatus } from "../lib/status";
const router = Router();

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

  const fields = await prisma.field.findMany({
    where,
    include: {
      updates: { select: { createdAt: true } },
    },
  });

  const statuses = fields.map((f) => computeFieldStatus(f));
  const breakdown = {
    ACTIVE: statuses.filter((s) => s === "ACTIVE").length,
    AT_RISK: statuses.filter((s) => s === "AT_RISK").length,
    COMPLETED: statuses.filter((s) => s === "COMPLETED").length,
  };

  const byStage = fields.reduce<Record<string, number>>((acc, f) => {
    acc[f.currentStage] = (acc[f.currentStage] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    totalFields: fields.length,
    statusBreakdown: breakdown,
    stageBreakdown: byStage,
    staleAssignedCount:
      role === ROLES.FIELD_AGENT
        ? statuses.filter((s) => s === "AT_RISK").length
        : undefined,
  });
});

export default router;
