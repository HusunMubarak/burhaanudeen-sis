import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";

/**
 * Removing a class-subject assignment is only allowed while it's
 * still empty (no assessments/results recorded against it yet). Once
 * an assessment exists, unassigning would cascade-delete real academic
 * records (Assessment/Result both onDelete: Cascade from
 * ClassSubject) — so this is refused rather than silently destroying
 * history, mirroring how the rest of the app never lets a delete
 * quietly take dependent records with it.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("academics", "write");
    const { id } = await params;

    const classSubject = await prisma.classSubject.findUnique({
      where: { id },
      include: { _count: { select: { assessments: true, teachers: true } } },
    });
    if (!classSubject) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

    if (classSubject._count.assessments > 0) {
      return NextResponse.json(
        { error: "This subject has assessments recorded for this class and can't be unassigned." },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.teacherSubject.deleteMany({ where: { classSubjectId: id } }),
      prisma.classSubject.delete({ where: { id } }),
    ]);

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "DELETE", entity: "ClassSubject", entityId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
