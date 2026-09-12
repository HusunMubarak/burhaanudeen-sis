import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { teacherSubjectSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("academics", "read");
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId") ?? undefined;
    const classSubjectId = searchParams.get("classSubjectId") ?? undefined;

    const assignments = await prisma.teacherSubject.findMany({
      where: { staffId, classSubjectId },
      include: {
        staff: { select: { id: true, user: { select: { name: true } } } },
        classSubject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assignments);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("academics", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = teacherSubjectSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const [staff, classSubject] = await Promise.all([
      prisma.staff.findUnique({ where: { id: parsed.data.staffId }, select: { id: true } }),
      prisma.classSubject.findUnique({ where: { id: parsed.data.classSubjectId }, select: { id: true } }),
    ]);
    if (!staff) return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    if (!classSubject) return NextResponse.json({ error: "Class-subject assignment not found." }, { status: 404 });

    const existing = await prisma.teacherSubject.findUnique({
      where: { staffId_classSubjectId: { staffId: parsed.data.staffId, classSubjectId: parsed.data.classSubjectId } },
    });
    if (existing) {
      return NextResponse.json({ error: "This teacher is already assigned to this class-subject." }, { status: 409 });
    }

    const created = await prisma.teacherSubject.create({
      data: { ...parsed.data, assignedById: session.user.id },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "TeacherSubject", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
