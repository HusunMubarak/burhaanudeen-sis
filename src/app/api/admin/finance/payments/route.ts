import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("fees", "read");
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId") ?? undefined;
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = 20;

    const where = studentId ? { studentId } : {};

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          reversal: true,
        },
        orderBy: { recordedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ payments, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("fees", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId }, select: { id: true } });
    if (!student) {
      return NextResponse.json({ error: "Student not found.", fieldErrors: { studentId: "Not found" } }, { status: 404 });
    }

    // Financial integrity: a payment, once created, is never edited —
    // see the reverse endpoint for how a mistake gets corrected.
    const payment = await prisma.payment.create({
      data: {
        studentId: parsed.data.studentId,
        academicYearId: parsed.data.academicYearId ?? null,
        termId: parsed.data.termId ?? null,
        amount: parsed.data.amount,
        date: parsed.data.date,
        method: parsed.data.method,
        reference: parsed.data.reference,
        description: parsed.data.description,
        recordedById: session.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Payment",
        entityId: payment.id,
        metadata: JSON.stringify({ studentId: parsed.data.studentId, amount: parsed.data.amount, method: parsed.data.method }),
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
