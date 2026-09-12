import "server-only";
import PDFDocument from "pdfkit";

type StudentRow = {
  admissionNumber: string;
  name: string;
  className: string;
  status: string;
  guardianPhone: string;
};

export async function generateStudentListPdf(schoolName: string, rows: StudentRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const emerald = "#0f5132";
    const ink = "#1c2321";

    doc.fillColor(emerald).fontSize(16).font("Helvetica-Bold").text(schoolName);
    doc.fillColor(ink).fontSize(11).font("Helvetica").text("Student List");
    doc.fontSize(9).fillColor("#666").text(new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()));
    doc.moveDown(1);

    const colX = [40, 150, 340, 470, 600];
    const headers = ["Admission No.", "Name", "Class", "Status", "Guardian Phone"];

    function drawHeader() {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(emerald);
      headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1, width: 130 }));
      doc.moveDown(0.5);
      doc.strokeColor("#ccc").moveTo(40, doc.y).lineTo(800, doc.y).stroke();
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
      doc.text(row.admissionNumber, colX[0], y, { width: 105 });
      doc.text(row.name, colX[1], y, { width: 185 });
      doc.text(row.className, colX[2], y, { width: 125 });
      doc.text(row.status, colX[3], y, { width: 125 });
      doc.text(row.guardianPhone, colX[4], y, { width: 150 });
      doc.moveDown(0.6);
    }

    doc.end();
  });
}
