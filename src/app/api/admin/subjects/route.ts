import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { subjectSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireModuleAccess("academics", "read");
    const subjects = await prisma.subject.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(subjects);
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

    const parsed = subjectSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const existing = await prisma.subject.findFirst({
      where: { OR: [{ name: parsed.data.name }, { code: parsed.data.code }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A subject with this name or code already exists.", fieldErrors: { code: "Already exists" } },
        { status: 409 }
      );
    }

    const created = await prisma.subject.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        level: parsed.data.level ?? null,
        isActive: parsed.data.isActive,
      },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "Subject", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
