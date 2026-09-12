import "server-only";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, ForbiddenError } from "@/lib/authorize";
import { isUnrestrictedAcademics } from "@/lib/academics/roles";

export { isUnrestrictedAcademics } from "@/lib/academics/roles";

export async function getStaffIdForUser(userId: string): Promise<string | null> {
  const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
  return staff?.id ?? null;
}

/** ClassSubject IDs this teacher is explicitly assigned to teach. */
export async function getTeacherClassSubjectIds(staffId: string): Promise<string[]> {
  const rows = await prisma.teacherSubject.findMany({ where: { staffId }, select: { classSubjectId: true } });
  return rows.map((r) => r.classSubjectId);
}

/**
 * Classes a teacher may mark/view attendance for: classes they lead
 * as class teacher, plus any class where they teach at least one
 * subject (a subject teacher covering for the class teacher can
 * still record the day's attendance).
 */
export async function getTeacherAttendanceClassIds(staffId: string): Promise<string[]> {
  const [led, taught] = await Promise.all([
    prisma.class.findMany({ where: { classTeacherId: staffId }, select: { id: true } }),
    prisma.teacherSubject.findMany({
      where: { staffId },
      select: { classSubject: { select: { classId: true } } },
    }),
  ]);
  const ids = new Set<string>();
  led.forEach((c) => ids.add(c.id));
  taught.forEach((t) => ids.add(t.classSubject.classId));
  return Array.from(ids);
}

/**
 * Require the caller can mark/view attendance for a specific class.
 * SUPER_ADMIN/PROPRIETOR/HEADTEACHER always can (module-level write
 * access). A Teacher additionally needs to lead the class or teach a
 * subject in it — prevents a teacher from marking attendance for a
 * class they have no connection to. Throws Unauthorized/Forbidden.
 */
export async function requireAttendanceAccessForClass(classId: string) {
  const session = await requireModuleAccess("attendance", "write");
  const roles = session.user.roles ?? [];
  if (isUnrestrictedAcademics(roles)) return session;

  const staffId = await getStaffIdForUser(session.user.id);
  if (!staffId) throw new ForbiddenError("No staff profile is linked to this account.");

  const classIds = await getTeacherAttendanceClassIds(staffId);
  if (!classIds.includes(classId)) {
    throw new ForbiddenError("You are not assigned to this class.");
  }
  return session;
}

/**
 * Require the caller can enter/edit results for a specific
 * class-subject. SUPER_ADMIN/PROPRIETOR/HEADTEACHER always can. A
 * Teacher can only enter results for a class-subject they are
 * explicitly assigned to via TeacherSubject — prevents an
 * unauthorized teacher from editing another teacher's results, even
 * though both may hold generic academics read access.
 */
export async function requireResultsAccessForClassSubject(classSubjectId: string) {
  const session = await requireModuleAccess("academics", "read");
  const roles = session.user.roles ?? [];
  if (isUnrestrictedAcademics(roles)) return session;

  const staffId = await getStaffIdForUser(session.user.id);
  if (!staffId) throw new ForbiddenError("No staff profile is linked to this account.");

  const classSubjectIds = await getTeacherClassSubjectIds(staffId);
  if (!classSubjectIds.includes(classSubjectId)) {
    throw new ForbiddenError("You are not assigned to teach this subject in this class.");
  }
  return session;
}
