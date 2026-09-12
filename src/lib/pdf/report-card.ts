import "server-only";
import PDFDocument from "pdfkit";
import type { SubjectReportRow } from "@/lib/academics/grading";

type ReportCardInput = {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  logoUrl?: string | null;
  studentName: string;
  admissionNumber: string;
  className: string;
  academicYearName: string;
  termName: string;
  subjectRows: SubjectReportRow[];
  overallAverage: number;
  overallGrade: string;
  attendance: { present: number; absent: number; late: number; excused: number; total: number; percentage: number };
};

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function generateReportCardPdf(input: ReportCardInput): Promise<Buffer> {
  const logoBuffer = input.logoUrl ? await fetchLogoBuffer(input.logoUrl) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const emerald = "#0f5132";
    const gold = "#b8860f";
    const ink = "#1c2321";
    const pageLeft = 48;
    const pageRight = 547;

    // Header
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, pageLeft, doc.y, { width: 48, height: 48 });
      } catch {
        // Corrupt/unsupported image — skip silently, the rest of the card still renders.
      }
    }
    doc.fillColor(emerald).fontSize(18).font("Helvetica-Bold").text(input.schoolName, { align: "center" });
    doc.moveDown(0.2);
    doc.fillColor(ink).fontSize(9).font("Helvetica").text(input.schoolAddress, { align: "center" });
    const contactLine = [input.schoolPhone, input.schoolEmail].filter(Boolean).join("  ·  ");
    if (contactLine) doc.text(contactLine, { align: "center" });

    doc.moveDown(0.75);
    doc.strokeColor(gold).lineWidth(1.5).moveTo(pageLeft, doc.y).lineTo(pageRight, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor(emerald).fontSize(14).font("Helvetica-Bold").text("Student Report Card", { align: "center" });
    doc.moveDown(1);

    // Student / term info
    doc.fillColor(ink).fontSize(10).font("Helvetica");
    const infoRows: [string, string][] = [
      ["Student", input.studentName],
      ["Admission No.", input.admissionNumber],
      ["Class", input.className],
      ["Academic Year", input.academicYearName],
      ["Term", input.termName],
    ];
    const colWidth = (pageRight - pageLeft) / 2;
    for (let i = 0; i < infoRows.length; i += 2) {
      const y = doc.y;
      const [l1, v1] = infoRows[i];
      doc.font("Helvetica-Bold").text(`${l1}: `, pageLeft, y, { continued: true }).font("Helvetica").text(v1);
      if (infoRows[i + 1]) {
        const [l2, v2] = infoRows[i + 1];
        doc
          .font("Helvetica-Bold")
          .text(`${l2}: `, pageLeft + colWidth, y, { continued: true })
          .font("Helvetica")
          .text(v2);
      }
    }
    doc.moveDown(1);

    // Subjects table
    doc.font("Helvetica-Bold").fontSize(11).fillColor(emerald).text("Academic Performance");
    doc.moveDown(0.4);

    const cols = [
      { label: "Subject", width: 220 },
      { label: "Score (%)", width: 90 },
      { label: "Grade", width: 70 },
      { label: "Remark", width: pageRight - pageLeft - 220 - 90 - 70 },
    ];
    let x = pageLeft;
    const headerY = doc.y;
    doc.fontSize(9).fillColor("#ffffff");
    doc.rect(pageLeft, headerY, pageRight - pageLeft, 18).fill(emerald);
    doc.fillColor("#ffffff").font("Helvetica-Bold");
    for (const col of cols) {
      doc.text(col.label, x + 4, headerY + 5, { width: col.width - 8 });
      x += col.width;
    }
    doc.moveDown(1.2);

    doc.font("Helvetica").fillColor(ink);
    let rowY = doc.y;
    let alt = false;
    for (const row of input.subjectRows) {
      if (rowY > 760) {
        doc.addPage();
        rowY = 48;
      }
      if (alt) {
        doc.rect(pageLeft, rowY, pageRight - pageLeft, 18).fill("#f4f1e8");
        doc.fillColor(ink);
      }
      alt = !alt;
      x = pageLeft;
      const values = [row.subjectName, row.overallScore.toFixed(1), row.grade, row.remark || "-"];
      for (let i = 0; i < cols.length; i++) {
        doc.text(values[i], x + 4, rowY + 4, { width: cols[i].width - 8 });
        x += cols[i].width;
      }
      rowY += 18;
    }
    doc.y = rowY + 8;

    if (input.subjectRows.length === 0) {
      doc.font("Helvetica-Oblique").fontSize(9).text("No results have been recorded for this term yet.");
      doc.moveDown(1);
    }

    doc.moveDown(0.5);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(ink)
      .text(`Overall Average: ${input.overallAverage.toFixed(1)}%   Overall Grade: ${input.overallGrade}`);
    doc.moveDown(1);

    // Attendance
    doc.font("Helvetica-Bold").fontSize(11).fillColor(emerald).text("Attendance");
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(ink)
      .text(
        `Present: ${input.attendance.present}   Absent: ${input.attendance.absent}   Late: ${input.attendance.late}   ` +
          `Excused: ${input.attendance.excused}   Total days: ${input.attendance.total}   ` +
          `Attendance rate: ${input.attendance.percentage.toFixed(1)}%`
      );
    doc.moveDown(1.5);

    doc.text("_____________________________", pageLeft);
    doc.text("Class Teacher's Signature", pageLeft);

    doc.end();
  });
}
