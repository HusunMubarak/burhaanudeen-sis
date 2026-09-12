import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { validatePromotionBatch, hasRemainingCapacity } from "@/lib/academics/promotion";

/** Carries a specific, user-facing 422 out of the confirm transaction
 * — same pattern as the enrollment route's EnrollmentConflictError.
 * Thrown before any tx.student.update runs, so Prisma rolls back the
 * whole transaction and the batch stays DRAFT with no student moved. */
class PromotionConflictError extends Error {
  status = 422;
}

/**
 * Confirm — the only step that actually moves students (E5: never
 * automatic). Requires academics WRITE, which per the RBAC matrix
 * means only PROPRIETOR/HEADTEACHER/SUPER_ADMIN can reach this route
 * at all — a Teacher (read-only on academics) cannot confirm a batch
 * even if they could see or help prepare one.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("academics", "write");
    const { id: batchId } = await params;

    const batch = await prisma.promotionBatch.findUnique({
      where: { id: batchId },
      include: { records: { include: { student: { select: { id: true, status: true } } } } },
    });
    if (!batch) return NextResponse.json({ error: "Promotion batch not found." }, { status: 404 });
    if (batch.status !== "DRAFT") {
      return NextResponse.json({ error: "This promotion batch has already been confirmed." }, { status: 409 });
    }

    const errors = validatePromotionBatch(
      batch.records.map((r) => ({ studentId: r.studentId, decision: r.decision, toClassId: r.toClassId }))
    );
    if (errors.length > 0) {
      return NextResponse.json({ error: "This batch isn't ready to confirm.", details: errors }, { status: 422 });
    }
    if (batch.records.length === 0) {
      return NextResponse.json({ error: "This batch has no students to promote." }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
      // Stable order (batch creation order) so error messages and the
      // eventual move order are deterministic across retries.
      const records = [...batch.records].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // A student could have been withdrawn, suspended, or moved
      // manually since this batch was drafted — re-check every
      // record against the student's *current* class/status rather
      // than trusting the snapshot the batch was built from.
      const freshStudents = await tx.student.findMany({
        where: { id: { in: records.map((r) => r.studentId) } },
        select: { id: true, classId: true, status: true, admissionNumber: true },
      });
      const studentById = new Map(freshStudents.map((s) => [s.id, s]));

      for (const record of records) {
        const fresh = studentById.get(record.studentId);
        if (!fresh || fresh.classId !== batch.fromClassId || fresh.status !== "ACTIVE") {
          throw new PromotionConflictError(
            `Student ${fresh?.admissionNumber ?? record.studentId} is no longer an active student in this batch's source class. Refresh the batch before confirming.`
          );
        }
      }

      // Validate every destination class up front — existence, target
      // year, and capacity (current occupancy + every other record in
      // this same batch also headed there) — before moving anyone.
      // Any single overflow fails the whole transaction, so a batch
      // that would overflow leaves every student exactly where they
      // were and the batch DRAFT.
      const destClassIds = [...new Set(records.filter((r) => r.toClassId).map((r) => r.toClassId as string))];
      const destClasses = destClassIds.length
        ? await tx.class.findMany({
            where: { id: { in: destClassIds } },
            select: { id: true, name: true, capacity: true, academicYearId: true, _count: { select: { students: true } } },
          })
        : [];
      const destClassById = new Map(destClasses.map((c) => [c.id, c]));

      const incomingCountByClass = new Map<string, number>();
      for (const r of records) {
        if (r.toClassId) incomingCountByClass.set(r.toClassId, (incomingCountByClass.get(r.toClassId) ?? 0) + 1);
      }

      const overflow: string[] = [];
      for (const [classId, incomingCount] of incomingCountByClass) {
        const cls = destClassById.get(classId);
        if (!cls) {
          overflow.push(`Destination class ${classId} no longer exists.`);
          continue;
        }
        if (cls.academicYearId !== batch.toAcademicYearId) {
          overflow.push(`${cls.name} does not belong to this batch's target academic year.`);
          continue;
        }
        if (!hasRemainingCapacity({ capacity: cls.capacity, currentCount: cls._count.students, incomingCount })) {
          overflow.push(
            `${cls.name} would overflow: ${cls._count.students} current + ${incomingCount} incoming exceeds capacity ${cls.capacity}.`
          );
        }
      }
      if (overflow.length > 0) {
        throw new PromotionConflictError(overflow.join(" "));
      }

      for (const record of records) {
        if (record.decision === "GRADUATE" || record.decision === "WITHDRAW") {
          const newStatus = record.decision === "GRADUATE" ? "GRADUATED" : "WITHDRAWN";
          await tx.student.update({
            where: { id: record.studentId },
            data: { classId: null, academicYearId: batch.toAcademicYearId, status: newStatus },
          });
          await tx.studentStatusHistory.create({
            data: {
              studentId: record.studentId,
              fromStatus: record.student.status,
              toStatus: newStatus,
              note: record.note || `Via promotion batch from ${batch.fromClassId}`,
              changedById: session.user.id,
            },
          });
        } else {
          // PROMOTE / RETAIN / TRANSFER — move to the destination
          // class in the destination academic year; status doesn't
          // change so no StudentStatusHistory row is needed (the
          // PromotionRecord itself is the permanent record of the move).
          await tx.student.update({
            where: { id: record.studentId },
            data: { classId: record.toClassId, academicYearId: batch.toAcademicYearId },
          });
        }
      }

      await tx.promotionBatch.update({
        where: { id: batchId },
        data: { status: "CONFIRMED", confirmedById: session.user.id, confirmedAt: new Date() },
      });
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CONFIRM", entity: "PromotionBatch", entityId: batchId },
    });

    return NextResponse.json({ ok: true, promoted: batch.records.length });
  } catch (err) {
    if (err instanceof PromotionConflictError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return authErrorResponse(err);
  }
}
