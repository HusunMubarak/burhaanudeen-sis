import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { assignFeesSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("fees", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = assignFeesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Select a class and academic year." }, { status: 422 });
    }

    const { classId, academicYearId, termId } = parsed.data;

    // Matches structures scoped to this exact class, or to "all
    // classes" (classId null) — and this exact term, or "whole year"
    // (termId null). Both are valid ways to configure a fee.
    const structures = await prisma.feeStructure.findMany({
      where: {
        academicYearId,
        isActive: true,
        AND: [
          { OR: [{ classId }, { classId: null }] },
          termId ? { OR: [{ termId }, { termId: null }] } : { termId: null },
        ],
      },
      include: { category: { select: { name: true } } },
    });

    if (structures.length === 0) {
      return NextResponse.json(
        { error: "No active fee structures match this class/year/term. Configure one first." },
        { status: 422 }
      );
    }

    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      select: { id: true },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: "This class has no active students to assign fees to." }, { status: 422 });
    }

    const rows = students.flatMap((student) =>
      structures.map((structure) => ({
        studentId: student.id,
        feeStructureId: structure.id,
        academicYearId,
        termId: termId ?? null,
        categoryName: structure.category.name,
        amount: structure.amount,
        assignedById: session.user.id,
      }))
    );

    // skipDuplicates relies on the (studentId, feeStructureId) unique
    // constraint — a student already assigned a given fee line item
    // is left untouched rather than getting a second, duplicate charge.
    const result = await prisma.studentFeeAssignment.createMany({ data: rows, skipDuplicates: true });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ASSIGN_FEES",
        entity: "Class",
        entityId: classId,
        metadata: JSON.stringify({ studentsCount: students.length, structuresCount: structures.length, created: result.count }),
      },
    });

    return NextResponse.json({
      studentsCount: students.length,
      structuresCount: structures.length,
      assignmentsCreated: result.count,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
