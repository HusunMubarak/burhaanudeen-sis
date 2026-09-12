import { requireModuleAccess } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherAttendanceClassIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { AttendanceManager } from "@/components/admin/attendance-manager";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const session = await requireModuleAccess("attendance");
  const roles = session.user.roles ?? [];

  let classIdFilter: { id: { in: string[] } } | Record<string, never> = {};
  if (!isUnrestrictedAcademics(roles)) {
    const staffId = await getStaffIdForUser(session.user.id);
    const allowed = staffId ? await getTeacherAttendanceClassIds(staffId) : [];
    classIdFilter = { id: { in: allowed } };
  }

  const [classes, terms, academicYears] = await Promise.all([
    prisma.class.findMany({ where: { isActive: true, ...classIdFilter }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.term.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Attendance</h1>
      <p className="mt-1 text-sm text-ink-soft">Mark daily attendance for a class, or review attendance trends.</p>
      <div className="mt-6">
        <AttendanceManager classes={classes} terms={terms} academicYears={academicYears} />
      </div>
    </div>
  );
}
