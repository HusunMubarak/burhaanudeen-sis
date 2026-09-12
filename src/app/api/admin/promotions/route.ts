import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { promotionBatchCreateSchema } from "@/lib/validation";
import { suggestPromotion } from "@/lib/academics/promotion";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("academics", "read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;

    const batches = await prisma.promotionBatch.findMany({
      where: { status: status as "DRAFT" | "CONFIRMED" | undefined },
      include: {
        fromClass: { select: { id: true, name: true } },
        toAcademicYear: { select: { id: true, name: true } },
        _count: { select: { records: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(batches);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/**
 * "Prepare Promotion" — creates a DRAFT batch pre-populated with a
 * suggested decision per active student in the source class (E5: this
 * only ever creates a proposal; nothing moves any student yet).
 */
export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("academics", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = promotionBatchCreateSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const [fromClass, toYear, existingBatch] = await Promise.all([
      prisma.class.findUnique({ where: { id: parsed.data.fromClassId } }),
      prisma.academicYear.findUnique({ where: { id: parsed.data.toAcademicYearId } }),
      prisma.promotionBatch.findUnique({
        where: {
          fromClassId_toAcademicYearId: {
            fromClassId: parsed.data.fromClassId,
            toAcademicYearId: parsed.data.toAcademicYearId,
          },
        },
      }),
    ]);
    if (!fromClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    if (!toYear) return NextResponse.json({ error: "Destination academic year not found." }, { status: 404 });
    if (existingBatch) {
      return NextResponse.json(
        { error: "A promotion batch already exists for this class and destination year." },
        { status: 409 }
      );
    }

    const [students, candidateClasses] = await Promise.all([
      prisma.student.findMany({ where: { classId: fromClass.id, status: "ACTIVE" }, select: { id: true } }),
      prisma.class.findMany({
        where: { academicYearId: toYear.id },
        select: { id: true, name: true, section: true, level: true },
      }),
    ]);

    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.promotionBatch.create({
        data: { fromClassId: fromClass.id, toAcademicYearId: toYear.id, createdById: session.user.id },
      });

      if (students.length > 0) {
        const suggestion = suggestPromotion(
          { id: fromClass.id, name: fromClass.name, section: fromClass.section, level: fromClass.level },
          candidateClasses
        );
        await tx.promotionRecord.createMany({
          data: students.map((s) => ({
            batchId: created.id,
            studentId: s.id,
            decision: suggestion.decision,
            toClassId: suggestion.toClassId,
          })),
        });
      }

      return created;
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "PromotionBatch", entityId: batch.id },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
