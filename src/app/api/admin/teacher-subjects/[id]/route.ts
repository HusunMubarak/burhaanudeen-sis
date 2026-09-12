import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("academics", "write");
    const { id } = await params;

    const existing = await prisma.teacherSubject.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

    await prisma.teacherSubject.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "DELETE", entity: "TeacherSubject", entityId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
