import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { studentStatusChangeSchema } from "@/lib/validation";
import { canTransitionStudent, type StudentStatus } from "@/lib/students";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("students", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = studentStatusChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Select a valid status." }, { status: 422 });
    }

    const student = await prisma.student.findUnique({ where: { id }, select: { status: true } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    // D1: reject illegal jumps (e.g. GRADUATED -> APPLICANT) server-side
    // — this is the actual enforcement point, never trust the client.
    if (!canTransitionStudent(student.status as StudentStatus, parsed.data.status as StudentStatus)) {
      return NextResponse.json(
        { error: `Cannot move a student from ${student.status} to ${parsed.data.status}.` },
        { status: 409 }
      );
    }

    // Historical records are never deleted just because a student
    // leaves — this only ever changes `status` plus appends history.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.student.update({
        where: { id },
        data: { status: parsed.data.status },
      });
      await tx.studentStatusHistory.create({
        data: {
          studentId: id,
          fromStatus: student.status,
          toStatus: parsed.data.status,
          note: parsed.data.note,
          changedById: session.user.id,
        },
      });
      return result;
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "STATUS_CHANGE",
        entity: "Student",
        entityId: id,
        metadata: JSON.stringify({ from: student.status, to: parsed.data.status }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
