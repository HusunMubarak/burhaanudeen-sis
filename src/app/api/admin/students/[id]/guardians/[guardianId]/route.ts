import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; guardianId: string }> }) {
  try {
    const session = await requireModuleAccess("students", "write");
    const { id: studentId, guardianId } = await params;

    const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
    if (!guardian || guardian.studentId !== studentId) {
      return NextResponse.json({ error: "Guardian link not found." }, { status: 404 });
    }

    await prisma.guardian.delete({ where: { id: guardianId } });
    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "DELETE", entity: "Guardian", entityId: guardianId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
