import "server-only";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

/**
 * Shared tabular export for every Report Centre category (Students,
 * Admissions, Finance, Academics, Attendance). Each report builds its
 * own columns/rows, then hands them to one of the three functions
 * below rather than every report re-implementing CSV escaping,
 * pdfkit pagination, or ExcelJS wiring — see src/lib/pdf/*.ts for the
 * earlier one-off versions this generalizes.
 */
export type ExportColumn = { key: string; header: string; width?: number };
export type ExportRow = Record<string, string | number>;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function rowsToCsv(columns: ExportColumn[], rows: ExportRow[]): string {
  const lines = [columns.map((c) => csvEscape(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(String(row[c.key] ?? ""))).join(","));
  }
  return lines.join("\r\n");
}

export async function rowsToExcelBuffer(sheetName: string, columns: ExportColumn[], rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generic landscape tabular PDF — a title/subtitle header, a repeated
 * column header on every page, and one row per line. Column widths
 * are distributed evenly across the printable width unless a column
 * specifies its own `width`.
 */
export async function rowsToPdfBuffer(
  schoolName: string,
  reportTitle: string,
  columns: ExportColumn[],
  rows: ExportRow[],
  subtitle?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const emerald = "#0f5132";
    const ink = "#1c2321";
    const pageLeft = 40;
    const pageRight = 800;
    const printableWidth = pageRight - pageLeft;

    const fixedWidth = columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
    const flexColumns = columns.filter((c) => !c.width).length;
    const flexWidth = flexColumns > 0 ? Math.max(60, (printableWidth - fixedWidth) / flexColumns) : 0;
    const colWidths = columns.map((c) => c.width ?? flexWidth);
    const colX: number[] = [];
    colWidths.reduce((x, w) => {
      colX.push(x);
      return x + w;
    }, pageLeft);

    doc.fillColor(emerald).fontSize(16).font("Helvetica-Bold").text(schoolName);
    doc.fillColor(ink).fontSize(11).font("Helvetica").text(reportTitle);
    if (subtitle) doc.fontSize(9).fillColor("#666").text(subtitle);
    doc.fontSize(9).fillColor("#666").text(new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()));
    doc.moveDown(1);

    function drawHeader() {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(emerald);
      columns.forEach((c, i) =>
        doc.text(c.header, colX[i], doc.y, { continued: i < columns.length - 1, width: colWidths[i] })
      );
      doc.moveDown(0.5);
      doc.strokeColor("#ccc").moveTo(pageLeft, doc.y).lineTo(pageRight, doc.y).stroke();
      doc.moveDown(0.3);
    }

    drawHeader();
    doc.font("Helvetica").fontSize(9).fillColor(ink);

    for (const row of rows) {
      if (doc.y > 520) {
        doc.addPage();
        drawHeader();
        doc.font("Helvetica").fontSize(9).fillColor(ink);
      }
      const y = doc.y;
      columns.forEach((c, i) => {
        doc.text(String(row[c.key] ?? ""), colX[i], y, { width: colWidths[i] });
      });
      doc.moveDown(0.3);
    }

    if (rows.length === 0) {
      doc.fillColor("#666").text("No records match this report's filters.");
    }

    doc.end();
  });
}

/** Content-Type + Content-Disposition headers for a downloadable export. */
export function exportHeaders(format: "csv" | "xlsx" | "pdf", filenameBase: string): HeadersInit {
  const types: Record<typeof format, string> = {
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
  };
  return {
    "Content-Type": types[format],
    "Content-Disposition": `attachment; filename="${filenameBase}.${format}"`,
  };
}
