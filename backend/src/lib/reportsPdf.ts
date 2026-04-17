import PDFDocument from "pdfkit";
import type { Response } from "express";

/**
 * PDF built-in fonts only support a limited encoding. Strip/replace characters
 * that otherwise corrupt the content stream (Chrome then shows "Failed to load PDF").
 */
function sanitizePdfText(s: string): string {
  return String(s ?? "")
    .replace(/\0/g, "")
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, "?");
}

function trunc(s: string, max: number): string {
  const t = sanitizePdfText(s).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}...`;
}

const BRAND = {
  bar: "#0d3b2c",
  headerFill: "#e8f0ec",
  border: "#b8c9be",
  muted: "#5a6570",
  zebra: "#f4f9f6",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatIsoForPdf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return trunc(sanitizePdfText(iso), 40);
  const m = MONTHS[d.getMonth()];
  const day = d.getDate();
  const y = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m} ${day}, ${y}  ${hh}:${mm}`;
}

function generatedStamp(): string {
  const d = new Date();
  const m = MONTHS[d.getMonth()];
  return `${m} ${d.getDate()}, ${d.getFullYear()} at ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export type FieldPdfRow = {
  id: string;
  name: string;
  cropType: string;
  plantingDate: string;
  stage: string;
  status: string;
  assignee: string;
};

export type UpdatePdfRow = {
  id: string;
  fieldName: string;
  createdAt: string;
  author: string;
  stage: string;
  note: string;
};

const MIN_LINE = 11;
const TABLE_HEADER_H = 22;

function pageContentBottom(doc: InstanceType<typeof PDFDocument>): number {
  return doc.page.height - 40;
}

function drawPageFooter(
  doc: InstanceType<typeof PDFDocument>,
  pageNum: number,
  total: number,
): void {
  const margin = doc.page.margins.left;
  const w = doc.page.width - margin * 2;
  const y = doc.page.height - 26;
  doc.save();
  doc.strokeColor(BRAND.border).lineWidth(0.35).moveTo(margin, y - 6).lineTo(margin + w, y - 6).stroke();
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(7.5);
  doc.text(`SmartSeason  |  Page ${pageNum} of ${total}  |  layout v2`, margin, y, {
    width: w,
    align: "center",
  });
  doc.restore();
  doc.fillColor("#000000");
}

/** Cover block: brand bar, titles, meta. Returns Y where the data table should start. */
function drawReportCover(
  doc: InstanceType<typeof PDFDocument>,
  opts: {
    headline: string;
    tagline: string;
    metaLine: string;
  },
): number {
  const w = doc.page.width;
  const left = doc.page.margins.left;
  const contentW = w - doc.page.margins.left - doc.page.margins.right;

  doc.save();
  doc.rect(0, 0, w, 46).fill(BRAND.bar);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text("SMARTSEASON", left, 14, {
    width: contentW,
  });
  doc.fontSize(17).text(opts.headline, left, 28, { width: contentW });
  doc.restore();

  let y = 56;
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text(opts.tagline, left, y, { width: contentW });
  y += 14;
  doc.text(opts.metaLine, left, y, { width: contentW });
  doc.fillColor("#000000");
  return y + 22;
}

function drawTableHeaderRow(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  left: number,
  contentW: number,
  xs: number[],
  ws: number[],
  labels: string[],
): number {
  const rowTop = y;
  const rowBottom = y + TABLE_HEADER_H;
  doc.save();
  doc.lineWidth(0.45);
  doc.rect(left, rowTop, contentW, TABLE_HEADER_H).fillAndStroke(BRAND.headerFill, BRAND.border);
  doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(8);
  for (let i = 0; i < labels.length; i++) {
    doc.text(labels[i]!, left + xs[i]!, rowTop + 7, { width: ws[i]! });
  }
  doc.restore();
  doc.fillColor("#000000");
  return rowBottom + 2;
}

function drawDataRow(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  left: number,
  contentW: number,
  xs: number[],
  ws: number[],
  parts: string[],
  fontSize: number,
  zebra: boolean,
): number {
  let rowH = MIN_LINE;
  doc.font("Helvetica").fontSize(fontSize);
  for (let i = 0; i < parts.length; i++) {
    const h = Math.ceil(doc.heightOfString(parts[i]!, { width: ws[i]! }));
    if (h > rowH) rowH = h;
  }
  const padY = 5;
  const rowBodyH = rowH + padY * 2;
  doc.save();
  if (zebra) {
    doc.rect(left, y, contentW, rowBodyH).fill(BRAND.zebra);
  }
  doc.strokeColor(BRAND.border).lineWidth(0.25).rect(left, y, contentW, rowBodyH).stroke();
  doc.restore();
  doc.fillColor("#222222").font("Helvetica").fontSize(fontSize);
  const textY = y + padY;
  for (let i = 0; i < parts.length; i++) {
    doc.text(parts[i]!, left + xs[i]!, textY, { width: ws[i]! });
  }
  doc.fillColor("#000000");
  return y + rowBodyH;
}

function drawContinuationTitle(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
): number {
  const left = doc.page.margins.left;
  const contentW = doc.page.width - left * 2;
  doc.save();
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND.bar);
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND.muted).text(title, left, 16, { width: contentW });
  doc.fillColor("#000000");
  return 36;
}

function isValidPdf(buf: Buffer): boolean {
  if (buf.length < 32) return false;
  if (!buf.subarray(0, 5).equals(Buffer.from("%PDF-"))) return false;
  return buf.includes(Buffer.from("%%EOF"));
}

function writeFieldsPdf(doc: InstanceType<typeof PDFDocument>, rows: FieldPdfRow[]): void {
  const left = doc.page.margins.left;
  const contentW = doc.page.width - left * 2;
  const bottom = pageContentBottom(doc);

  const xs = [0, 78, 198, 278, 358, 438, 508];
  const ws = [72, 114, 72, 72, 72, 64, contentW - 508];

  let y = drawReportCover(doc, {
    headline: "Field register",
    tagline: "Season overview: crops, stages, status, and assignments.",
    metaLine: `Prepared ${generatedStamp()}  |  ${rows.length} field${rows.length === 1 ? "" : "s"}`,
  });

  const labels = ["ID", "Name", "Crop", "Planted", "Stage", "Status", "Assignee"];

  function tableHeaderRow(startY: number, continued: boolean): number {
    if (continued) {
      startY = drawContinuationTitle(doc, "Field register (continued)");
    }
    return drawTableHeaderRow(doc, startY, left, contentW, xs, ws, labels);
  }

  y = tableHeaderRow(y, false);
  let rowIdx = 0;
  for (const r of rows) {
    if (y > bottom) {
      doc.addPage();
      y = tableHeaderRow(48, true);
    }
    const parts = [
      trunc(r.id, 10),
      trunc(r.name, 22),
      trunc(r.cropType, 14),
      formatIsoForPdf(r.plantingDate),
      trunc(r.stage, 12),
      trunc(r.status, 11),
      trunc(r.assignee, 80),
    ];
    y = drawDataRow(doc, y, left, contentW, xs, ws, parts, 7, rowIdx % 2 === 1);
    rowIdx++;
  }
}

function writeUpdatesPdf(doc: InstanceType<typeof PDFDocument>, rows: UpdatePdfRow[]): void {
  const left = doc.page.margins.left;
  const contentW = doc.page.width - left * 2;
  const bottom = pageContentBottom(doc);

  const xs = [0, 118, 248, 328, 398];
  const ws = [110, 122, 72, 62, contentW - 398];

  let y = drawReportCover(doc, {
    headline: "Activity log",
    tagline: "Field visits and stage updates across the season.",
    metaLine: `Prepared ${generatedStamp()}  |  ${rows.length} entr${rows.length === 1 ? "y" : "ies"}`,
  });

  const labels = ["When", "Field", "Author", "Stage", "Note"];

  function tableHeaderRow(startY: number, continued: boolean): number {
    if (continued) {
      startY = drawContinuationTitle(doc, "Activity log (continued)");
    }
    return drawTableHeaderRow(doc, startY, left, contentW, xs, ws, labels);
  }

  y = tableHeaderRow(y, false);
  let rowIdx = 0;
  for (const r of rows) {
    if (y > bottom) {
      doc.addPage();
      y = tableHeaderRow(48, true);
    }
    const parts = [
      formatIsoForPdf(r.createdAt),
      trunc(r.fieldName, 28),
      trunc(r.author, 18),
      trunc(r.stage, 10),
      trunc(r.note, 220),
    ];
    y = drawDataRow(doc, y, left, contentW, xs, ws, parts, 7, rowIdx % 2 === 1);
    rowIdx++;
  }
}

/** YYYY-MM-DD plus local HHmm so each download gets a distinct filename (avoids opening an old cached file). */
function pdfAttachmentStamp(): string {
  const d = new Date();
  const day = d.toISOString().slice(0, 10);
  const hm = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day}_${hm}`;
}

function renderPdfBuffer(
  write: (doc: InstanceType<typeof PDFDocument>) => void,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 36,
      size: "A4",
      layout: "landscape",
      compress: false,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);
    try {
      write(doc);
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawPageFooter(doc, i - range.start + 1, range.count);
      }
    } catch (e) {
      reject(e);
      return;
    }
    doc.end();
  });
}

export async function sendFieldsPdf(res: Response, rows: FieldPdfRow[]): Promise<void> {
  const buf = await renderPdfBuffer((doc) => writeFieldsPdf(doc, rows));
  if (!isValidPdf(buf)) {
    console.error("Invalid PDF buffer (fields)", buf.length);
    res.status(500).json({ error: "Failed to build valid PDF" });
    return;
  }
  const name = `smartseason-fields-${pdfAttachmentStamp()}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("Cache-Control", "no-store, no-cache");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-SmartSeason-Pdf-Layout", "2");
  res.send(buf);
}

export async function sendUpdatesPdf(res: Response, rows: UpdatePdfRow[]): Promise<void> {
  const buf = await renderPdfBuffer((doc) => writeUpdatesPdf(doc, rows));
  if (!isValidPdf(buf)) {
    console.error("Invalid PDF buffer (activity)", buf.length);
    res.status(500).json({ error: "Failed to build valid PDF" });
    return;
  }
  const name = `smartseason-activity-${pdfAttachmentStamp()}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("Cache-Control", "no-store, no-cache");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-SmartSeason-Pdf-Layout", "2");
  res.send(buf);
}
