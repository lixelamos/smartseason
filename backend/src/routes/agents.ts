import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authRequired, requireAdmin } from "../middleware/auth";
import { ROLES } from "../lib/constants";

const router = Router();

router.use(authRequired, requireAdmin);

router.get("/", async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: ROLES.FIELD_AGENT },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json(agents);
});

export default router;
