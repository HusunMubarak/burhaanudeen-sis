import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { feeStructureSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("fees", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = feeStructureSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form and try again." }, { status: 422 });
    }

    const existing = await prisma.feeStructure.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Fee structure not found." }, { status: 404 });

    const updated = await prisma.feeStructure.update({
      where: { id },
      data: {
        ...parsed.data,
        termId: parsed.data.termId === undefined ? undefined : parsed.data.termId,
        classId: parsed.data.classId === undefined ? undefined : parsed.data.classId,
      },
    });

    // Fee changes are audited (spec: "Audit: Fee changes") — the
    // before/after amount matters most since StudentFeeAssignment
    // already snapshots amounts, so this edit never retroactively
    // changes what an already-assigned student owes.
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "FeeStructure",
        entityId: id,
        metadata: JSON.stringify({ from: existing.amount.toString(), to: updated.amount.toString() }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
