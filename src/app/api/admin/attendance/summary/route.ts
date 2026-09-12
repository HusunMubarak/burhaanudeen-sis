import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherAttendanceClassIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { summarizeAttendance } from "@/lib/academics/grading";

/**
 * One flexible summary endpoint rather than five near-identical
 * routes (daily/class/student/monthly/term all boil down to
 * "summarize these Attendance rows"). Filters combine with AND:
 *   classId, studentId, termId, academicYearId, month (1-12) + year, date
 * A Teacher without unrestricted access is limited to their own
 * classes even if they pass a classId they don't teach.
 */
export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("attendance", "read");
    const { searchParams } = new URL(req.url);

    const classId = searchParams.get("classId") ?? undefined;
    const studentId = searchParams.get("studentId") ?? undefined;
    const termId = searchParams.get("termId") ?? undefined;
    const academicYearId = searchParams.get("academicYearId") ?? undefined;
    const date = searchParams.get("date") ?? undefined;
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

    const roles = session.user.roles ?? [];
    let classIdFilter: string | { in: string[] } | undefined = classId;
    if (!isUnrestrictedAcademics(roles)) {
      const staffId = await getStaffIdForUser(session.user.id);
      const allowed = staffId ? await getTeacherAttendanceClassIds(staffId) : [];
      if (classId && !allowed.includes(classId)) {
        return NextResponse.json({ error: "You are not assigned to this class." }, { status: 403 });
      }
      classIdFilter = classId ?? { in: allowed };
    }

    const where: Record<string, unknown> = {
      ...(classIdFilter ? { classId: classIdFilter } : {}),
      ...(studentId ? { studentId } : {}),
      ...(termId ? { termId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
    };
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      where.date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
    } else if (month && year) {
      where.date = { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) };
    }

    const records = await prisma.attendance.findMany({
      where,
      select: { status: true, studentId: true, classId: true, date: true },
    });

    const summary = summarizeAttendance(records);

    // Per-class breakdown is useful whenever more than one class is
    // in scope (daily/monthly views spanning several classes).
    const byClassMap = new Map<string, { status: string }[]>();
    for (const r of records) {
      const list = byClassMap.get(r.classId) ?? [];
      list.push(r);
      byClassMap.set(r.classId, list);
    }
    const classIds = Array.from(byClassMap.keys());
    const classes = classIds.length
      ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
      : [];
    const classNameById = new Map(classes.map((c) => [c.id, c.name]));
    const byClass = classIds.map((id) => ({
      classId: id,
      className: classNameById.get(id) ?? id,
      ...summarizeAttendance(byClassMap.get(id) as { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" }[]),
    }));

    return NextResponse.json({ summary, byClass, recordCount: records.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}
