import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ROLES } from "../lib/constants";
import { authRequired } from "../middleware/auth";
import { presentField, type FieldWithRelations } from "../services/fieldPresenter";
import { toCsvRow } from "../lib/csv";
import { sendFieldsPdf, sendUpdatesPdf, type FieldPdfRow, type UpdatePdfRow } from "../lib/reportsPdf";

const router = Router();

router.use(authRequired);

function reportFormat(req: Request): "csv" | "pdf" {
  const q = req.query.format;
  const raw =
    typeof q === "string"
      ? q
      : Array.isArray(q) && typeof q[0] === "string"
        ? q[0]
        : "";
  if (raw.toLowerCase() === "pdf") return "pdf";
  if (/\bformat=pdf\b/i.test(req.originalUrl ?? "")) return "pdf";
  return "csv";
}

function csvFilename(prefix: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `${prefix}-${d}.csv`;
}

/** UTF-8 BOM so Excel opens UTF-8 CSV correctly on Windows. */
const CSV_BOM = "\uFEFF";

async function loadFieldsData(userId: string, role: string) {
  const where =
    role === ROLES.ADMIN
      ? {}
      : {
          assignedAgentId: userId,
        };

  const rows = await prisma.field.findMany({
    where,
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      updates: {
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((raw) => {
    const f = presentField(raw as FieldWithRelations);
    const assignee = f.assignedAgent ? `${f.assignedAgent.name}` : "";
    return {
      csv: [
        f.id,
        f.name,
        f.cropType,
        f.plantingDate,
        f.currentStage,
        f.status,
        f.assignedAgent?.name ?? "",
        f.assignedAgent?.email ?? "",
        f.createdAt,
        f.updatedAt,
      ] as (string | number)[],
      pdf: {
        id: f.id,
        name: f.name,
        cropType: f.cropType,
        plantingDate: f.plantingDate,
        stage: f.currentStage,
        status: f.status,
        assignee,
      } satisfies FieldPdfRow,
    };
  });
}

async function loadUpdatesData(userId: string, role: string) {
  const updates = await prisma.fieldUpdate.findMany({
    where:
      role === ROLES.ADMIN
        ? {}
        : {
            field: { assignedAgentId: userId },
          },
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: {
      field: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, role: true, email: true } },
    },
  });

  return updates.map((u) => ({
    csv: [
      u.id,
      u.field.id,
      u.field.name,
      u.createdAt.toISOString(),
      u.author.name,
      u.author.email,
      u.author.role,
      u.stage ?? "",
      u.note ?? "",
    ] as (string | number)[],
    pdf: {
      id: u.id,
      fieldName: u.field.name,
      createdAt: u.createdAt.toISOString(),
      author: u.author.name,
      stage: u.stage ?? "",
      note: u.note ?? "",
    } satisfies UpdatePdfRow,
  }));
}

async function sendFieldsReport(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.sub;
    const role = req.user!.role;
    const format = reportFormat(req);

    const packed = await loadFieldsData(userId, role);

    if (format === "pdf") {
      await sendFieldsPdf(
        res,
        packed.map((p) => p.pdf),
      );
      return;
    }

    const header = toCsvRow([
      "id",
      "name",
      "crop_type",
      "planting_date",
      "stage",
      "status",
      "assignee_name",
      "assignee_email",
      "created_at",
      "updated_at",
    ]);
    const lines = packed.map((p) => toCsvRow(p.csv));
    const body = CSV_BOM + [header, ...lines].join("\n") + "\n";
    const name = csvFilename("smartseason-fields");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(body);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to build fields report" });
    }
  }
}

async function sendUpdatesReport(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.sub;
    const role = req.user!.role;
    const format = reportFormat(req);

    const packed = await loadUpdatesData(userId, role);

    if (format === "pdf") {
      await sendUpdatesPdf(
        res,
        packed.map((p) => p.pdf),
      );
      return;
    }

    const header = toCsvRow([
      "id",
      "field_id",
      "field_name",
      "created_at",
      "author_name",
      "author_email",
      "author_role",
      "stage",
      "note",
    ]);
    const lines = packed.map((p) => toCsvRow(p.csv));
    const body = CSV_BOM + [header, ...lines].join("\n") + "\n";
    const name = csvFilename("smartseason-activity");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(body);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to build activity report" });
    }
  }
}

router.get("/fields", sendFieldsReport);
router.get("/updates", sendUpdatesReport);

router.get("/fields.csv", sendFieldsReport);
router.get("/updates.csv", sendUpdatesReport);

export default router;
