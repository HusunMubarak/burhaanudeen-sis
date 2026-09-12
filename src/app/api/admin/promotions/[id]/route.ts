import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { validatePromotionBatch } from "@/lib/academics/promotion";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess("academics", "read");
    const { id } = await params;

    const batch = await prisma.promotionBatch.findUnique({
      where: { id },
      include: {
        fromClass: { select: { id: true, name: true, section: true } },
        toAcademicYear: { select: { id: true, name: true } },
        records: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
            toClass: { select: { id: true, name: true } },
          },
          orderBy: { student: { lastName: "asc" } },
        },
      },
    });
    if (!batch) return NextResponse.json({ error: "Promotion batch not found." }, { status: 404 });

    const errors = validatePromotionBatch(
      batch.records.map((r) => ({ studentId: r.studentId, decision: r.decision, toClassId: r.toClassId }))
    );

    return NextResponse.json({ ...batch, readyToConfirm: batch.status === "DRAFT" && errors.length === 0, errors });
  } catch (err) {
    return authErrorResponse(err);
  }
}
