import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { AssignmentsManager } from "@/components/admin/assignments-manager";

export const metadata = { title: "Class & Teacher Assignments" };

export default async function AssignmentsPage() {
  await requireModuleAccess("academics", "read");

  const [classes, subjects, classSubjects, teachers] = await Promise.all([
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.classSubject.findMany({
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        teachers: { include: { staff: { select: { id: true, user: { select: { name: true } } } } } },
        _count: { select: { assessments: true } },
      },
      orderBy: [{ class: { level: "asc" } }, { subject: { name: "asc" } }],
    }),
    prisma.staff.findMany({
      where: { category: "TEACHING", status: "ACTIVE" },
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Class & Teacher Assignments</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Assign subjects to classes, then assign the teacher(s) who teach each class-subject.
      </p>
      <div className="mt-6">
        <AssignmentsManager
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          initialAssignments={classSubjects.map((cs) => ({
            id: cs.id,
            class: cs.class,
            subject: cs.subject,
            assessmentCount: cs._count.assessments,
            teachers: cs.teachers.map((t) => ({ teacherSubjectId: t.id, staff: t.staff })),
          }))}
        />
      </div>
    </div>
  );
}
