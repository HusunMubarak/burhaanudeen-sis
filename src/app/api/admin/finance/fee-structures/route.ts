import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { feeStructureSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("fees", "read");
    const url = new URL(req.url);
    const academicYearId = url.searchParams.get("academicYearId") ?? undefined;

    const structures = await prisma.feeStructure.findMany({
      where: { ...(academicYearId ? { academicYearId } : {}) },
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { category: { name: "asc" } }],
    });

    return NextResponse.json(structures);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("fees", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = feeStructureSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const existing = await prisma.feeStructure.findUnique({
  where: {
    academicYearId_termId_classId_categoryId: {
      academicYearId: parsed.data.academicYearId,
      termId: parsed.data.termId ?? null,
      classId: parsed.data.classId ?? null,
      categoryId: parsed.data.categoryId,
    } as any,                 // ← add this
  },
});

    if (existing) {
      return NextResponse.json(
        { error: "A fee structure already exists for this exact year/term/class/category combination. Edit it instead." },
        { status: 409 }
      );
    }

    const created = await prisma.feeStructure.create({
      data: {
        academicYearId: parsed.data.academicYearId,
        termId: parsed.data.termId ?? null,
        classId: parsed.data.classId ?? null,
        categoryId: parsed.data.categoryId,
        amount: parsed.data.amount,
        isActive: parsed.data.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "FeeStructure",
        entityId: created.id,
        metadata: JSON.stringify({ amount: parsed.data.amount }),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}