import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { classSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireModuleAccess("academics", "read");
    const classes = await prisma.class.findMany({
      include: {
        academicYear: { select: { id: true, name: true } },
        classTeacher: { select: { id: true, user: { select: { name: true } } } },
        _count: { select: { students: true } },
      },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(classes);
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

    const parsed = classSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const existing = await prisma.class.findUnique({
      where: { academicYearId_name: { academicYearId: parsed.data.academicYearId, name: parsed.data.name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A class with this name already exists for that academic year.", fieldErrors: { name: "Already exists" } },
        { status: 409 }
      );
    }

    const created = await prisma.class.create({
      data: {
        name: parsed.data.name,
        section: parsed.data.section,
        level: parsed.data.level,
        capacity: parsed.data.capacity,
        academicYearId: parsed.data.academicYearId,
        classTeacherId: parsed.data.classTeacherId ?? null,
        isActive: parsed.data.isActive,
      },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "Class", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
