import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { classSubjectSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("academics", "read");
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId") ?? undefined;
    const subjectId = searchParams.get("subjectId") ?? undefined;

    const assignments = await prisma.classSubject.findMany({
      where: { classId, subjectId },
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true, code: true } },
        teachers: {
          include: { staff: { select: { id: true, user: { select: { name: true } } } } },
        },
        _count: { select: { assessments: true } },
      },
      orderBy: [{ class: { level: "asc" } }, { subject: { name: "asc" } }],
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

    const parsed = classSubjectSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const [klass, subject] = await Promise.all([
      prisma.class.findUnique({ where: { id: parsed.data.classId }, select: { id: true } }),
      prisma.subject.findUnique({ where: { id: parsed.data.subjectId }, select: { id: true } }),
    ]);
    if (!klass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

    const existing = await prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId: parsed.data.classId, subjectId: parsed.data.subjectId } },
    });
    if (existing) {
      return NextResponse.json({ error: "This subject is already assigned to this class." }, { status: 409 });
    }

    const created = await prisma.classSubject.create({ data: parsed.data });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "ClassSubject", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
