import { requireModuleAccess } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherAttendanceClassIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { AttendanceReportPanel } from "@/components/admin/attendance-report-panel";

export const metadata = { title: "Attendance Reports" };

export default async function AttendanceReportsPage() {
  const session = await requireModuleAccess("reports", "read");
  const roles = session.user.roles ?? [];

  let classIdFilter: { id: { in: string[] } } | Record<string, never> = {};
  if (!isUnrestrictedAcademics(roles)) {
    const staffId = await getStaffIdForUser(session.user.id);
    const allowed = staffId ? await getTeacherAttendanceClassIds(staffId) : [];
    classIdFilter = { id: { in: allowed } };
  }

  const [classes, terms, students] = await Promise.all([
    prisma.class.findMany({ where: { isActive: true, ...classIdFilter }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.term.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.student.findMany({
      where: classIdFilter.id ? { classId: classIdFilter.id } : {},
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
      take: 500,
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Attendance Reports</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Daily, monthly, term, per-student, or per-class attendance — export as PDF, Excel, or CSV.
      </p>
      <div className="mt-6">
        <AttendanceReportPanel
          classes={classes}
          terms={terms}
          students={students.map((s) => ({ id: s.id, name: `${s.lastName}, ${s.firstName}` }))}
        />
      </div>
    </div>
  );
}
