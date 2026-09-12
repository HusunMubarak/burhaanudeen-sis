import "server-only";
import PDFDocument from "pdfkit";

type LetterInput = {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  applicantName: string;
  applicationNumber: string;
  admissionNumber?: string;
  levelAppliedFor: string;
  academicYearName: string;
};

export async function generateAdmissionLetterPdf(input: LetterInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const emerald = "#0f5132";
    const gold = "#b8860f";
    const ink = "#1c2321";

    // Header
    doc.fillColor(emerald).fontSize(20).font("Helvetica-Bold").text(input.schoolName, { align: "center" });
    doc.moveDown(0.2);
    doc
      .fillColor(ink)
      .fontSize(10)
      .font("Helvetica")
      .text(input.schoolAddress, { align: "center" });
    const contactLine = [input.schoolPhone, input.schoolEmail].filter(Boolean).join("  ·  ");
    if (contactLine) doc.text(contactLine, { align: "center" });

    doc.moveDown(1);
    doc.strokeColor(gold).lineWidth(1.5).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
    doc.moveDown(1.5);

    doc.fillColor(emerald).fontSize(16).font("Helvetica-Bold").text("Admission Letter", { align: "center" });
    doc.moveDown(1.5);

    doc.fillColor(ink).fontSize(11).font("Helvetica");
    doc.text(`Date: ${new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date())}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").text(`Dear Parent/Guardian of ${input.applicantName},`);
    doc.moveDown(0.75);
    doc
      .font("Helvetica")
      .text(
        `We are pleased to inform you that ${input.applicantName} has been offered admission to ` +
          `${input.schoolName} for ${input.levelAppliedFor}, for the ${input.academicYearName} academic year.`,
        { align: "justify" }
      );
    doc.moveDown(1);

    const rows: [string, string][] = [
      ["Application Number", input.applicationNumber],
      ["Admission Number", input.admissionNumber ?? "To be assigned upon enrollment"],
      ["Class", input.levelAppliedFor],
      ["Academic Year", input.academicYearName],
    ];
    for (const [label, value] of rows) {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value);
    }
    doc.moveDown(1);

    doc
      .font("Helvetica-Bold")
      .text("Reporting Instructions", { underline: false })
      .font("Helvetica")
      .moveDown(0.3)
      .text(
        "Please complete the enrollment process at the school office with the original copies of all " +
          "submitted documents before the start of the term. Bring this letter with you on the reporting day.",
        { align: "justify" }
      );
    doc.moveDown(1.5);

    doc.text("We look forward to welcoming your ward to our school community.");
    doc.moveDown(2);

    doc.text("_____________________________");
    doc.text("For: " + input.schoolName);
    doc.text("Admissions Office");

    doc.end();
  });
}
