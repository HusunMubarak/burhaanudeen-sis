import "server-only";
import PDFDocument from "pdfkit";

export type IdCardStudent = {
  admissionNumber: string;
  name: string;
  className: string;
  photoUrl?: string | null;
};

/** Fetches an image URL into a Buffer for pdfkit. pdfkit only accepts
 * JPEG/PNG bytes, not arbitrary formats, and a broken/unreachable URL
 * must never fail the whole batch of cards — callers get `null` and
 * fall back to a placeholder box. */
async function fetchImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

const CARD_WIDTH = 243; // ~85.6mm CR80 card width at 72dpi
const CARD_HEIGHT = 153; // ~54mm CR80 card height at 72dpi
const MARGIN = 24;
const GAP = 12;

export async function generateIdCardsPdf(
  schoolName: string,
  logoUrl: string | null | undefined,
  academicYearName: string,
  students: IdCardStudent[]
): Promise<Buffer> {
  const logoBuffer = await fetchImageBuffer(logoUrl);
  // Fetch every student photo up front so drawing below stays
  // synchronous — pdfkit's page/text calls are not async-safe.
  const photoBuffers = await Promise.all(students.map((s) => fetchImageBuffer(s.photoUrl)));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const emerald = "#0f5132";
    const ink = "#1c2321";
    const pageWidth = doc.page.width - MARGIN * 2;
    const cardsPerRow = Math.max(1, Math.floor((pageWidth + GAP) / (CARD_WIDTH + GAP)));
    const pageHeight = doc.page.height - MARGIN * 2;
    const rowsPerPage = Math.max(1, Math.floor((pageHeight + GAP) / (CARD_HEIGHT + GAP)));
    const perPage = cardsPerRow * rowsPerPage;

    students.forEach((student, i) => {
      const posOnPage = i % perPage;
      if (i > 0 && posOnPage === 0) doc.addPage();

      const col = posOnPage % cardsPerRow;
      const row = Math.floor(posOnPage / cardsPerRow);
      const x = MARGIN + col * (CARD_WIDTH + GAP);
      const y = MARGIN + row * (CARD_HEIGHT + GAP);

      // Card border
      doc.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 8).lineWidth(1).strokeColor("#ccc").stroke();

      // Header band
      doc.save();
      doc.roundedRect(x, y, CARD_WIDTH, 36, 8).fill(emerald);
      doc.restore();

      if (logoBuffer) {
        try {
          doc.image(logoBuffer, x + 6, y + 4, { fit: [28, 28] });
        } catch {
          // corrupt/unsupported image bytes — skip, header text still renders
        }
      }
      doc
        .fillColor("#fff")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(schoolName, x + 40, y + 6, { width: CARD_WIDTH - 46 })
        .fontSize(7)
        .font("Helvetica")
        .text("Student Identification Card", x + 40, y + 20, { width: CARD_WIDTH - 46 });

      // Photo
      const photoBuffer = photoBuffers[i];
      const photoX = x + 8;
      const photoY = y + 44;
      const photoSize = 56;
      if (photoBuffer) {
        try {
          doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize, fit: [photoSize, photoSize] });
        } catch {
          doc.rect(photoX, photoY, photoSize, photoSize).strokeColor("#ccc").stroke();
        }
      } else {
        doc.rect(photoX, photoY, photoSize, photoSize).strokeColor("#ccc").stroke();
        doc.fontSize(6).fillColor("#999").text("No Photo", photoX, photoY + photoSize / 2 - 3, { width: photoSize, align: "center" });
      }

      // Details
      const textX = photoX + photoSize + 10;
      const textWidth = CARD_WIDTH - (textX - x) - 8;
      doc
        .fillColor(ink)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(student.name, textX, photoY, { width: textWidth })
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#555")
        .moveDown(0.3)
        .text(`ID: ${student.admissionNumber}`, textX, doc.y, { width: textWidth })
        .text(`Class: ${student.className}`, textX, doc.y, { width: textWidth })
        .text(`Year: ${academicYearName}`, textX, doc.y, { width: textWidth });

      doc
        .fontSize(6)
        .fillColor("#999")
        .text("If found, please return to the school office.", x + 8, y + CARD_HEIGHT - 14, { width: CARD_WIDTH - 16 });
    });

    if (students.length === 0) {
      doc.fontSize(11).fillColor("#666").text("No students selected.");
    }

    doc.end();
  });
}
