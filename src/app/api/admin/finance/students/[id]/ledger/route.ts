import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { buildStudentFeeLedger } from "@/lib/finance";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess("fees", "read");
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        class: { select: { id: true, name: true } },
        feeAssignments: {
          orderBy: { createdAt: "desc" },
          include: { academicYear: { select: { name: true } }, term: { select: { name: true } } },
        },
        payments: { orderBy: { date: "desc" }, include: { reversal: true } },
      },
    });

    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const ledger = buildStudentFeeLedger(
      student.feeAssignments.map((a) => ({ amount: Number(a.amount) })),
      student.payments.map((p) => ({ amount: Number(p.amount), status: p.status }))
    );

    return NextResponse.json({
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.class,
      },
      ledger,
      feeAssignments: student.feeAssignments,
      payments: student.payments,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
