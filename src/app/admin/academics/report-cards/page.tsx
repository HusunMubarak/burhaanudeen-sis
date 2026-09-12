import { requireModuleAccess } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherAttendanceClassIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { ReportCardPicker } from "@/components/admin/report-card-picker";

export const metadata = { title: "Report Cards" };

export default async function ReportCardsPage() {
  const session = await requireModuleAccess("academics");
  const roles = session.user.roles ?? [];

  let studentWhere: { classId: { in: string[] }; status: "ACTIVE" } | { status: "ACTIVE" } = { status: "ACTIVE" };
  if (!isUnrestrictedAcademics(roles)) {
    const staffId = await getStaffIdForUser(session.user.id);
    const allowed = staffId ? await getTeacherAttendanceClassIds(staffId) : [];
    studentWhere = { classId: { in: allowed }, status: "ACTIVE" };
  }

  const [students, terms, academicYears] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: { id: true, firstName: true, lastName: true, admissionNumber: true, class: { select: { name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.term.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Report Cards</h1>
      <p className="mt-1 text-sm text-ink-soft">Generate a student&apos;s report card as a PDF for a given term.</p>
      <div className="mt-6">
        <ReportCardPicker
          students={students.map((s) => ({
            id: s.id,
            label: `${s.firstName} ${s.lastName} (${s.admissionNumber ?? "—"})${s.class ? ` — ${s.class.name}` : ""}`,
          }))}
          terms={terms}
          academicYears={academicYears}
        />
      </div>
    </div>
  );
}
