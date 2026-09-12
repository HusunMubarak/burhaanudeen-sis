import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { paymentVerifySchema } from "@/lib/validation";
import { canTransitionPayment, canTransitionApplication, type PaymentClaimStatus } from "@/lib/admissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("admissions", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = paymentVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 422 });
    }

    const claim = await prisma.paymentClaim.findUnique({
      where: { applicationId: id },
      include: { application: { select: { status: true } } },
    });
    if (!claim) {
      return NextResponse.json({ error: "No payment claim found for this application." }, { status: 404 });
    }

    const target: PaymentClaimStatus = parsed.data.action === "VERIFY" ? "VERIFIED" : "REJECTED";
    if (!canTransitionPayment(claim.status as PaymentClaimStatus, target)) {
      return NextResponse.json(
        { error: `Cannot mark this claim as ${target.toLowerCase()} from its current state.` },
        { status: 409 }
      );
    }

    // C2: a verified payment is what typically kicks an application
    // out of the applicant's inbox and into the review queue.
    const shouldAdvanceToReview =
      target === "VERIFIED" &&
      claim.application.status === "SUBMITTED" &&
      canTransitionApplication("SUBMITTED", "UNDER_REVIEW");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.paymentClaim.update({
        where: { applicationId: id },
        data: {
          status: target,
          verificationNote: parsed.data.note,
          verifiedById: session.user.id,
          verifiedAt: new Date(),
        },
      });
      if (shouldAdvanceToReview) {
        await tx.application.update({ where: { id }, data: { status: "UNDER_REVIEW" } });
      }
      return result;
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: target === "VERIFIED" ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
        entity: "Application",
        entityId: id,
        metadata: JSON.stringify({ note: parsed.data.note, advancedToReview: shouldAdvanceToReview }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
