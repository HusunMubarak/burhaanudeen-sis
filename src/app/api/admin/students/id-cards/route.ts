import { NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/settings";
import { generateIdCardsPdf } from "@/lib/pdf/id-cards";
import { idCardRequestSchema } from "@/lib/validation";
import { STUDENT_EXPORT_ROLES } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    // ID cards carry a student's photo and admission number — the
    // same PII-export boundary as the students CSV/Excel/PDF export.
    const session = await requireRole(...STUDENT_EXPORT_ROLES);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = idCardRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Select at least one student." }, { status: 422 });
    }

    const [students, settings, currentYear] = await Promise.all([
      prisma.student.findMany({
        where: { id: { in: parsed.data.studentIds } },
        include: { class: { select: { name: true } } },
      }),
      getSchoolSettings(),
      prisma.academicYear.findFirst({ where: { isCurrent: true }, select: { name: true } }),
    ]);

    const pdf = await generateIdCardsPdf(
      settings.name,
      settings.logoUrl,
      currentYear?.name ?? "—",
      students.map((s) => ({
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        className: s.class?.name ?? "—",
        photoUrl: s.photoUrl,
      }))
    );

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "EXPORT", entity: "StudentIdCards", metadata: JSON.stringify({ count: students.length }) },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="student-id-cards.pdf"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
