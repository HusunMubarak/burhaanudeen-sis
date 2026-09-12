import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherClassSubjectIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { computeOverallScore } from "@/lib/academics/grading";

/**
 * Average subject performance per class for a term — the "class
 * performance" piece of the Academic Dashboard. Each student's own
 * assessments for a class-subject are first combined the same way a
 * report card would (computeOverallScore), then those per-student
 * scores are averaged to get one number per class-subject.
 */
export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("academics", "read");
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId") ?? undefined;
    const termId = searchParams.get("termId") ?? undefined;
    const academicYearId = searchParams.get("academicYearId") ?? undefined;

    if (!termId || !academicYearId) {
      return NextResponse.json({ error: "termId and academicYearId are required." }, { status: 400 });
    }

    // Item 6 (teacher scoping audit): this endpoint only checked
    // module-level academics:read, which a Teacher holds — without
    // this, a Teacher could request every class's average performance
    // school-wide, not just the class-subjects they're assigned to
    // (the same restriction /api/admin/assessments already applies).
    const roles = session.user.roles ?? [];
    let classSubjectFilter: { in: string[] } | undefined;
    if (!isUnrestrictedAcademics(roles)) {
      const staffId = await getStaffIdForUser(session.user.id);
      const allowed = staffId ? await getTeacherClassSubjectIds(staffId) : [];
      classSubjectFilter = { in: allowed };
    }

    const results = await prisma.result.findMany({
      where: {
        assessment: {
          termId,
          academicYearId,
          ...(classId ? { classSubject: { classId } } : {}),
          ...(classSubjectFilter ? { classSubjectId: classSubjectFilter } : {}),
        },
      },
      include: {
        assessment: {
          select: {
            maxScore: true,
            weight: true,
            classSubject: {
              select: {
                id: true,
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    type Bucket = {
      classId: string;
      className: string;
      subjectId: string;
      subjectName: string;
      byStudent: Map<string, { score: number; maxScore: number; weight: number }[]>;
    };
    const buckets = new Map<string, Bucket>();

    for (const r of results) {
      const cs = r.assessment.classSubject;
      const bucket = buckets.get(cs.id) ?? {
        classId: cs.class.id,
        className: cs.class.name,
        subjectId: cs.subject.id,
        subjectName: cs.subject.name,
        byStudent: new Map(),
      };
      const list = bucket.byStudent.get(r.studentId) ?? [];
      list.push({ score: Number(r.score), maxScore: Number(r.assessment.maxScore), weight: Number(r.assessment.weight) });
      bucket.byStudent.set(r.studentId, list);
      buckets.set(cs.id, bucket);
    }

    const rows = Array.from(buckets.values())
      .map((b) => {
        const studentScores = Array.from(b.byStudent.values()).map((items) => computeOverallScore(items));
        const average = studentScores.length
          ? Math.round((studentScores.reduce((s, v) => s + v, 0) / studentScores.length) * 100) / 100
          : 0;
        return {
          classId: b.classId,
          className: b.className,
          subjectId: b.subjectId,
          subjectName: b.subjectName,
          studentCount: studentScores.length,
          averageScore: average,
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className) || a.subjectName.localeCompare(b.subjectName));

    return NextResponse.json(rows);
  } catch (err) {
    return authErrorResponse(err);
  }
}
