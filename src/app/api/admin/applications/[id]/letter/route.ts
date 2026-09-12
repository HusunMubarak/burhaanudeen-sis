import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/settings";
import { generateAdmissionLetterPdf } from "@/lib/pdf/admission-letter";

const LETTER_ELIGIBLE = new Set(["ACCEPTED", "ENROLLED"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess("admissions", "read");
    const { id } = await params;

    const [application, settings] = await Promise.all([
      prisma.application.findUnique({
        where: { id },
        include: { academicYear: true, student: true },
      }),
      getSchoolSettings(),
    ]);

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    if (!LETTER_ELIGIBLE.has(application.status)) {
      return NextResponse.json({ error: "This application hasn't been accepted yet." }, { status: 409 });
    }

    const pdf = await generateAdmissionLetterPdf({
      schoolName: settings.name,
      schoolAddress: settings.address,
      schoolPhone: settings.phone,
      schoolEmail: settings.email,
      applicantName: `${application.firstName} ${application.lastName}`,
      applicationNumber: application.applicationNumber,
      admissionNumber: application.student?.admissionNumber,
      levelAppliedFor: application.levelAppliedFor,
      academicYearName: application.academicYear?.name ?? "the current",
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="admission-letter-${application.applicationNumber}.pdf"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
