import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/authorize";
import { requireAttendanceAccessForClass } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { attendanceBulkSchema } from "@/lib/validation";

function parseDateOnly(value: string): Date {
  // Store/compare attendance dates as UTC midnight so "the same day"
  // never drifts across a server/client timezone difference.
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

/** Roster for a class on a date, merged with any attendance already
 * recorded — the client renders one row per student either way. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const dateParam = searchParams.get("date");
    if (!classId || !dateParam) {
      return NextResponse.json({ error: "classId and date are required." }, { status: 400 });
    }

    await requireAttendanceAccessForClass(classId);

    const date = parseDateOnly(dateParam);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }

    const [klass, students, records] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true, academicYearId: true },
      }),
      prisma.student.findMany({
        where: { classId, status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.attendance.findMany({ where: { classId, date } }),
    ]);
    if (!klass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const recordByStudent = new Map(records.map((r) => [r.studentId, r]));
    const roster = students.map((s) => {
      const record = recordByStudent.get(s.id);
      return {
        student: s,
        status: record?.status ?? null,
        note: record?.note ?? "",
        recordedAt: record?.recordedAt ?? null,
      };
    });

    return NextResponse.json({ class: klass, date: dateParam, roster });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = attendanceBulkSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const session = await requireAttendanceAccessForClass(parsed.data.classId);

    const klass = await prisma.class.findUnique({
      where: { id: parsed.data.classId },
      select: { id: true, academicYearId: true },
    });
    if (!klass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const validStudentIds = new Set(
      (
        await prisma.student.findMany({
          where: { classId: parsed.data.classId },
          select: { id: true },
        })
      ).map((s) => s.id)
    );
    const unknownStudent = parsed.data.entries.find((e) => !validStudentIds.has(e.studentId));
    if (unknownStudent) {
      return NextResponse.json({ error: "One or more students are not in this class." }, { status: 400 });
    }

    const dateOnly = new Date(
      Date.UTC(parsed.data.date.getUTCFullYear(), parsed.data.date.getUTCMonth(), parsed.data.date.getUTCDate())
    );

    const academicYearId = parsed.data.academicYearId ?? klass.academicYearId;
    const termId = parsed.data.termId ?? null;

    await prisma.$transaction(
      parsed.data.entries.map((entry) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: entry.studentId, date: dateOnly } },
          create: {
            studentId: entry.studentId,
            classId: parsed.data.classId,
            date: dateOnly,
            status: entry.status,
            note: entry.note,
            termId,
            academicYearId,
            recordedById: session.user.id,
          },
          update: {
            classId: parsed.data.classId,
            status: entry.status,
            note: entry.note,
            termId,
            academicYearId,
            recordedById: session.user.id,
          },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Attendance",
        entityId: `${parsed.data.classId}:${dateParamFromDate(dateOnly)}`,
      },
    });

    return NextResponse.json({ ok: true, count: parsed.data.entries.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}

function dateParamFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
