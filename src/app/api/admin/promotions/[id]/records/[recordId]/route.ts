import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { promotionRecordUpdateSchema } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const session = await requireModuleAccess("academics", "write");
    const { id: batchId, recordId } = await params;

    const record = await prisma.promotionRecord.findUnique({ where: { id: recordId } });
    if (!record || record.batchId !== batchId) {
      return NextResponse.json({ error: "Promotion record not found." }, { status: 404 });
    }

    const batch = await prisma.promotionBatch.findUnique({ where: { id: batchId } });
    if (!batch) return NextResponse.json({ error: "Promotion batch not found." }, { status: 404 });
    if (batch.status !== "DRAFT") {
      return NextResponse.json({ error: "This promotion batch has already been confirmed." }, { status: 409 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = promotionRecordUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    if (parsed.data.toClassId) {
      const destination = await prisma.class.findUnique({ where: { id: parsed.data.toClassId } });
      if (!destination) return NextResponse.json({ error: "Destination class not found." }, { status: 404 });
    }

    const updated = await prisma.promotionRecord.update({
      where: { id: recordId },
      data: {
        decision: parsed.data.decision,
        toClassId: ["GRADUATE", "WITHDRAW"].includes(parsed.data.decision) ? null : parsed.data.toClassId,
        note: parsed.data.note,
      },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "PromotionRecord", entityId: recordId },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
