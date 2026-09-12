import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { paymentReversalSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("fees", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = paymentReversalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Explain why this payment is being reversed." }, { status: 422 });
    }

    const payment = await prisma.payment.findUnique({ where: { id }, include: { reversal: true } });
    if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    if (payment.status === "REVERSED") {
      return NextResponse.json({ error: "This payment has already been reversed." }, { status: 409 });
    }

    // Never overwrite the historical record — flip status and attach
    // a PaymentReversal explaining why. The original amount, date,
    // method and recordedBy are untouched forever.
    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({ where: { id }, data: { status: "REVERSED" } }),
      prisma.paymentReversal.create({
        data: { paymentId: id, reason: parsed.data.reason, reversedById: session.user.id },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REVERSE_PAYMENT",
        entity: "Payment",
        entityId: id,
        metadata: JSON.stringify({ reason: parsed.data.reason, originalAmount: payment.amount.toString() }),
      },
    });

    return NextResponse.json(updatedPayment);
  } catch (err) {
    return authErrorResponse(err);
  }
}
