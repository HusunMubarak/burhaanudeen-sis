import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherAttendanceClassIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/settings";
import { rowsToCsv, rowsToExcelBuffer, rowsToPdfBuffer, exportHeaders, type ExportColumn } from "@/lib/export/table-export";

const REPORT_TITLES: Record<string, string> = {
  daily: "Daily Attendance",
  monthly: "Monthly Attendance",
  term: "Term Attendance",
  student: "Student Attendance History",
  class: "Class Attendance",
};

const COLUMNS: ExportColumn[] = [
  { key: "date", header: "Date", width: 90 },
  { key: "student", header: "Student" },
  { key: "className", header: "Class", width: 100 },
  { key: "status", header: "Status", width: 80 },
  { key: "note", header: "Note", width: 160 },
];

export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("attendance", "read");
    const roles = session.user.roles ?? [];
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "daily";
    const format = (url.searchParams.get("format") ?? "csv") as "csv" | "xlsx" | "pdf";
    const date = url.searchParams.get("date");
    const month = url.searchParams.get("month"); // "YYYY-MM"
    const termId = url.searchParams.get("termId") ?? undefined;
    const studentId = url.searchParams.get("studentId") ?? undefined;
    const classId = url.searchParams.get("classId") ?? undefined;

    // A Teacher only ever sees/exports attendance for classes they are
    // assigned to — the same restriction the attendance manager page
    // already applies when marking attendance.
    let classScope: { in: string[] } | undefined;
    if (!isUnrestrictedAcademics(roles)) {
      const staffId = await getStaffIdForUser(session.user.id);
      classScope = { in: staffId ? await getTeacherAttendanceClassIds(staffId) : [] };
    }

    const where: Record<string, unknown> = {};
    if (classScope) where.classId = classScope;
    if (classId) where.classId = classScope ? { in: [classId].filter((id) => classScope!.in.includes(id)) } : classId;
    if (studentId) where.studentId = studentId;
    if (termId) where.termId = termId;

    if (type === "daily" && date) {
      where.date = new Date(date);
    } else if (type === "monthly" && month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: { student: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5000,
    });

    const rows = records.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      student: `${r.student.lastName}, ${r.student.firstName}`,
      className: r.class.name,
      status: r.status,
      note: r.note,
    }));

    const title = REPORT_TITLES[type] ?? "Attendance Report";

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "EXPORT", entity: "AttendanceReport", metadata: JSON.stringify({ type, format, count: rows.length }) },
    });

    if (format === "pdf") {
      const settings = await getSchoolSettings();
      const pdf = await rowsToPdfBuffer(settings.name, title, COLUMNS, rows);
      return new NextResponse(new Uint8Array(pdf), { headers: exportHeaders("pdf", `attendance-${type}`) });
    }
    if (format === "xlsx") {
      const buffer = await rowsToExcelBuffer(title, COLUMNS, rows);
      return new NextResponse(new Uint8Array(buffer), { headers: exportHeaders("xlsx", `attendance-${type}`) });
    }
    return new NextResponse(rowsToCsv(COLUMNS, rows), { headers: exportHeaders("csv", `attendance-${type}`) });
  } catch (err) {
    return authErrorResponse(err);
  }
}
