import { requireModuleAccess } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherClassSubjectIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { AssessmentsManager } from "@/components/admin/assessments-manager";

export const metadata = { title: "Exams & Assessments" };

export default async function AssessmentsPage() {
  const session = await requireModuleAccess("academics");
  const roles = session.user.roles ?? [];

  let classSubjectFilter: { id: { in: string[] } } | Record<string, never> = {};
  let allowedClassSubjectIds: string[] | null = null;
  if (!isUnrestrictedAcademics(roles)) {
    const staffId = await getStaffIdForUser(session.user.id);
    allowedClassSubjectIds = staffId ? await getTeacherClassSubjectIds(staffId) : [];
    classSubjectFilter = { id: { in: allowedClassSubjectIds } };
  }

  const [classSubjects, terms, academicYears, assessments] = await Promise.all([
    prisma.classSubject.findMany({
      where: classSubjectFilter,
      include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true, code: true } } },
      orderBy: [{ class: { level: "asc" } }, { subject: { name: "asc" } }],
    }),
    prisma.term.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.assessment.findMany({
      where: allowedClassSubjectIds ? { classSubjectId: { in: allowedClassSubjectIds } } : {},
      include: {
        classSubject: { include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } } },
        term: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Exams &amp; Assessments</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Create class tests, quizzes and exams, then enter student scores for each one.
      </p>
      <div className="mt-6">
        <AssessmentsManager
          classSubjects={classSubjects.map((cs) => ({
            id: cs.id,
            label: `${cs.subject.name} — ${cs.class.name}`,
          }))}
          terms={terms}
          academicYears={academicYears}
          initialAssessments={assessments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            date: a.date.toISOString(),
            maxScore: Number(a.maxScore),
            weight: Number(a.weight),
            resultCount: a._count.results,
            className: a.classSubject.class.name,
            subjectName: a.classSubject.subject.name,
            termName: a.term.name,
          }))}
        />
      </div>
    </div>
  );
}
