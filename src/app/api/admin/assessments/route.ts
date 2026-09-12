import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import {
  isUnrestrictedAcademics,
  getStaffIdForUser,
  getTeacherClassSubjectIds,
  requireResultsAccessForClassSubject,
} from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { assessmentSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("academics", "read");
    const { searchParams } = new URL(req.url);
    const classSubjectId = searchParams.get("classSubjectId") ?? undefined;
    const termId = searchParams.get("termId") ?? undefined;
    const academicYearId = searchParams.get("academicYearId") ?? undefined;
    const classId = searchParams.get("classId") ?? undefined;

    const roles = session.user.roles ?? [];
    let classSubjectFilter: string | { in: string[] } | undefined = classSubjectId;
    if (!isUnrestrictedAcademics(roles)) {
      const staffId = await getStaffIdForUser(session.user.id);
      const allowed = staffId ? await getTeacherClassSubjectIds(staffId) : [];
      if (classSubjectId && !allowed.includes(classSubjectId)) {
        return NextResponse.json({ error: "You are not assigned to this class-subject." }, { status: 403 });
      }
      classSubjectFilter = classSubjectId ?? { in: allowed };
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        ...(classSubjectFilter ? { classSubjectId: classSubjectFilter } : {}),
        termId,
        academicYearId,
        ...(classId ? { classSubject: { classId } } : {}),
      },
      include: {
        classSubject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        term: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(assessments);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = assessmentSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const session = await requireResultsAccessForClassSubject(parsed.data.classSubjectId);

    const [classSubject, term, academicYear] = await Promise.all([
      prisma.classSubject.findUnique({ where: { id: parsed.data.classSubjectId }, select: { id: true } }),
      prisma.term.findUnique({ where: { id: parsed.data.termId }, select: { id: true } }),
      prisma.academicYear.findUnique({ where: { id: parsed.data.academicYearId }, select: { id: true } }),
    ]);
    if (!classSubject) return NextResponse.json({ error: "Class-subject not found." }, { status: 404 });
    if (!term) return NextResponse.json({ error: "Term not found." }, { status: 404 });
    if (!academicYear) return NextResponse.json({ error: "Academic year not found." }, { status: 404 });

    const created = await prisma.assessment.create({
      data: { ...parsed.data, createdById: session.user.id },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "Assessment", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
