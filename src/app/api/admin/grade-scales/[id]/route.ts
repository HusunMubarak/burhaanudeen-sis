import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { gradeScaleSchema } from "@/lib/validation";
import { bandsOverlap } from "@/lib/academics/grading";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("academics", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = gradeScaleSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form and try again." }, { status: 422 });
    }

    if (parsed.data.minScore !== undefined || parsed.data.maxScore !== undefined || parsed.data.isActive !== false) {
      const others = await prisma.gradeScale.findMany({ where: { isActive: true, id: { not: id } } });
      const current = await prisma.gradeScale.findUnique({ where: { id } });
      if (current) {
        const merged = { ...current, ...parsed.data };
        const wouldOverlap = bandsOverlap([
          ...others.map((s) => ({
            minScore: Number(s.minScore),
            maxScore: Number(s.maxScore),
            grade: s.grade,
            remark: s.remark,
            isActive: s.isActive,
          })),
          {
            minScore: Number(merged.minScore),
            maxScore: Number(merged.maxScore),
            grade: merged.grade,
            remark: merged.remark,
            isActive: merged.isActive,
          },
        ]);
        if (wouldOverlap) {
          return NextResponse.json({ error: "This range overlaps an existing active grade band." }, { status: 409 });
        }
      }
    }

    const updated = await prisma.gradeScale.update({ where: { id }, data: parsed.data });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "GradeScale", entityId: id },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("academics", "write");
    const { id } = await params;

    const existing = await prisma.gradeScale.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Grade band not found." }, { status: 404 });

    await prisma.gradeScale.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "DELETE", entity: "GradeScale", entityId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
