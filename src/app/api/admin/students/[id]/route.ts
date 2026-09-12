import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validation";
import { needsTeacherScoping, getTeacherClassIds } from "@/lib/data/students";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("students", "read");
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, section: true } },
        academicYear: { select: { id: true, name: true } },
        documents: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "desc" } },
        application: {
          select: { id: true, applicationNumber: true, status: true, createdAt: true },
        },
      },
    });

    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    // B1: a Teacher outside this student's class sees a 404, same as
    // if the record didn't exist — never confirm existence out of scope.
    if (needsTeacherScoping(session.user.roles ?? [])) {
      const classIds = await getTeacherClassIds(session.user.id);
      if (!student.classId || !classIds.includes(student.classId)) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }
    }

    return NextResponse.json(student);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("students", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = studentSchema.partial().safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    // Status changes go through /status so they're always logged to
    // StudentStatusHistory — silently drop it here rather than let it
    // slip through unrecorded.
    const { status: _status, ...rest } = parsed.data;
    void _status;

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: rest.dateOfBirth ?? undefined,
      },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "Student", entityId: id },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
