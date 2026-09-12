import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/authorize";
import { requireResultsAccessForClassSubject } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { resultsBulkSchema } from "@/lib/validation";

/** Roster of students in the assessment's class, merged with any
 * scores already entered — mirrors the attendance roster GET. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { classSubject: { select: { classId: true } } },
    });
    if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

    await requireResultsAccessForClassSubject(assessment.classSubjectId);

    const [students, results] = await Promise.all([
      prisma.student.findMany({
        where: { classId: assessment.classSubject.classId, status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.result.findMany({ where: { assessmentId: id } }),
    ]);

    const resultByStudent = new Map(results.map((r) => [r.studentId, r]));
    const roster = students.map((s) => {
      const r = resultByStudent.get(s.id);
      return { student: s, score: r ? Number(r.score) : null, remark: r?.remark ?? "" };
    });

    return NextResponse.json({ assessment, roster });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { classSubject: { select: { classId: true } } },
    });
    if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

    const session = await requireResultsAccessForClassSubject(assessment.classSubjectId);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = resultsBulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the scores and try again." }, { status: 422 });
    }

    const maxScore = Number(assessment.maxScore);
    const overMax = parsed.data.entries.find((e) => e.score > maxScore);
    if (overMax) {
      return NextResponse.json(
        { error: `A score cannot exceed this assessment's maximum of ${maxScore}.` },
        { status: 422 }
      );
    }

    const validStudentIds = new Set(
      (
        await prisma.student.findMany({
          where: { classId: assessment.classSubject.classId },
          select: { id: true },
        })
      ).map((s) => s.id)
    );
    const unknownStudent = parsed.data.entries.find((e) => !validStudentIds.has(e.studentId));
    if (unknownStudent) {
      return NextResponse.json({ error: "One or more students are not in this class." }, { status: 400 });
    }

    await prisma.$transaction(
      parsed.data.entries.map((entry) =>
        prisma.result.upsert({
          where: { assessmentId_studentId: { assessmentId: id, studentId: entry.studentId } },
          create: {
            assessmentId: id,
            studentId: entry.studentId,
            score: entry.score,
            remark: entry.remark,
            enteredById: session.user.id,
          },
          update: { score: entry.score, remark: entry.remark, updatedById: session.user.id },
        })
      )
    );

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "Result", entityId: id },
    });

    return NextResponse.json({ ok: true, count: parsed.data.entries.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}
