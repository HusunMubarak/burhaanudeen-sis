import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validation";
import { listStudents, needsTeacherScoping, getTeacherClassIds } from "@/lib/data/students";
import { generateStudentAdmissionNumber } from "@/lib/ids";

export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("students", "read");
    const url = new URL(req.url);
    const sp = url.searchParams;

    // B1: Teachers only ever see students in their own classes.
    const restrictToClassIds = needsTeacherScoping(session.user.roles ?? [])
      ? await getTeacherClassIds(session.user.id)
      : undefined;

    const result = await listStudents({
      q: sp.get("q") ?? undefined,
      classId: sp.get("classId") ?? undefined,
      status: sp.get("status") ?? undefined,
      academicYearId: sp.get("academicYearId") ?? undefined,
      sort: (sp.get("sort") as "name" | "admissionNumber" | "createdAt") ?? undefined,
      dir: (sp.get("dir") as "asc" | "desc") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
      restrictToClassIds,
    });

    return NextResponse.json(result);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("students", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const admissionNumber = await generateStudentAdmissionNumber();

    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          admissionNumber,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          otherNames: parsed.data.otherNames,
          photoUrl: parsed.data.photoUrl ?? null,
          gender: parsed.data.gender,
          dateOfBirth: parsed.data.dateOfBirth,
          nationality: parsed.data.nationality,
          address: parsed.data.address,
          guardianName: parsed.data.guardianName,
          guardianPhone: parsed.data.guardianPhone,
          guardianEmail: parsed.data.guardianEmail,
          emergencyContactName: parsed.data.emergencyContactName,
          emergencyContactPhone: parsed.data.emergencyContactPhone,
          previousSchool: parsed.data.previousSchool,
          classId: parsed.data.classId ?? null,
          academicYearId: parsed.data.academicYearId ?? null,
          status: parsed.data.status ?? "ACTIVE",
        },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId: created.id,
          fromStatus: null,
          toStatus: created.status,
          note: "Created directly by administrator",
          changedById: session.user.id,
        },
      });

      return created;
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Student",
        entityId: student.id,
        metadata: JSON.stringify({ admissionNumber }),
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
