import { notFound } from "next/navigation";
import { requireModuleAccess, ForbiddenError } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherClassSubjectIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { ResultsEntryManager } from "@/components/admin/results-entry-manager";

export const metadata = { title: "Enter Results" };

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireModuleAccess("academics");

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      classSubject: {
        include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } },
      },
      term: { select: { name: true } },
    },
  });
  if (!assessment) notFound();

  const roles = session.user.roles ?? [];
  if (!isUnrestrictedAcademics(roles)) {
    const staffId = await getStaffIdForUser(session.user.id);
    const allowed = staffId ? await getTeacherClassSubjectIds(staffId) : [];
    if (!allowed.includes(assessment.classSubjectId)) {
      throw new ForbiddenError("You are not assigned to teach this subject in this class.");
    }
  }

  const [students, results] = await Promise.all([
    prisma.student.findMany({
      where: { classId: assessment.classSubject.classId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.result.findMany({ where: { assessmentId: id } }),
  ]);
  const resultByStudent = new Map(results.map((r) => [r.studentId, r]));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">{assessment.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {assessment.classSubject.subject.name} — {assessment.classSubject.class.name} · {assessment.term.name} · Max score{" "}
        {Number(assessment.maxScore)}
      </p>
      <div className="mt-6">
        <ResultsEntryManager
          assessmentId={id}
          maxScore={Number(assessment.maxScore)}
          roster={students.map((s) => {
            const r = resultByStudent.get(s.id);
            return { student: s, score: r ? Number(r.score) : null, remark: r?.remark ?? "" };
          })}
        />
      </div>
    </div>
  );
}
