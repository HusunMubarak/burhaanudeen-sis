import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentClaimSchema } from "@/lib/validation";
import { canTransitionPayment, phoneMatches, feeAmountMatches, type PaymentClaimStatus } from "@/lib/admissions";
import { checkRateLimit, getClientIp, rateLimitResponse, honeypotFilled } from "@/lib/public-guard";
import { notifyRoles } from "@/lib/notifications";

const GENERIC_NOT_FOUND = {
  error: "We couldn't find a matching application. Check your application number and guardian phone number.",
};

export async function POST(req: Request) {
  // A5: 5 payment claims / 15 min / IP — same sensitivity as apply.
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(ip, "admissions:payment", 5);
  if (!allowed) return rateLimitResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (honeypotFilled(body)) {
    return NextResponse.json({ ok: true, status: "PENDING_VERIFICATION" }, { status: 201 });
  }

  const parsed = paymentClaimSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
  }

  const data = parsed.data;

  const application = await prisma.application.findUnique({
    where: { applicationNumber: data.applicationNumber.trim().toUpperCase() },
    include: { paymentClaim: true },
  });

  // A4: applicationNumber alone is not proof of identity — require the
  // guardian phone on file to match too, and return the exact same
  // generic error either way so application numbers can't be
  // enumerated by watching which ones return "not found" vs proceed.
  if (!application || !phoneMatches(application.guardianPhone, data.guardianPhone)) {
    return NextResponse.json(GENERIC_NOT_FOUND, { status: 404 });
  }

  const currentStatus: PaymentClaimStatus = application.paymentClaim?.status ?? "NOT_SUBMITTED";
  if (!canTransitionPayment(currentStatus, "PENDING_VERIFICATION")) {
    return NextResponse.json(
      { error: "A payment claim for this application has already been submitted and cannot be changed here." },
      { status: 409 }
    );
  }

  // C4: the amount must match the configured admission form fee
  // (tolerance for floating-point rounding), so an admin never has to
  // manually reconcile a partial or over-payment claim.
  const settings = await prisma.schoolSettings.findFirst({ select: { admissionFormFee: true } });
  const expectedFee = Number(settings?.admissionFormFee ?? 0);
  if (!feeAmountMatches(data.amount, expectedFee)) {
    return NextResponse.json(
      {
        error: `The amount paid must match the admission form fee (GHS ${expectedFee.toFixed(2)}).`,
        fieldErrors: { amount: `Must equal GHS ${expectedFee.toFixed(2)}` },
      },
      { status: 422 }
    );
  }

  let claim;
  try {
    claim = await prisma.paymentClaim.upsert({
      where: { applicationId: application.id },
      update: {
        payerName: data.payerName,
        payerPhone: data.payerPhone,
        network: data.network,
        amount: data.amount,
        reference: data.reference,
        paidAt: data.paidAt,
        screenshotUrl: data.screenshotUrl || null,
        status: "PENDING_VERIFICATION",
        verificationNote: "",
        verifiedById: null,
        verifiedAt: null,
      },
      create: {
        applicationId: application.id,
        payerName: data.payerName,
        payerPhone: data.payerPhone,
        network: data.network,
        amount: data.amount,
        reference: data.reference,
        paidAt: data.paidAt,
        screenshotUrl: data.screenshotUrl || null,
        status: "PENDING_VERIFICATION",
      },
    });
  } catch (err) {
    // C4: PaymentClaim.reference is globally unique — a reused MoMo
    // reference (typo, or someone resubmitting the same transaction
    // for a different application) fails cleanly rather than 500ing.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "This transaction reference has already been used for a payment claim.", fieldErrors: { reference: "Already used" } },
        { status: 409 }
      );
    }
    throw err;
  }

  // Phase 5: every admissions decision-maker gets an in-app nudge —
  // best-effort, never blocks the applicant's response either way.
  await notifyRoles(["PROPRIETOR", "HEADTEACHER", "ADMISSIONS_OFFICER"], {
    type: "ADMISSION_PAYMENT",
    title: "New admission payment awaiting verification",
    body: `${application.firstName} ${application.lastName} (${application.applicationNumber})`,
    link: "/admin/admissions",
  });

  return NextResponse.json({ ok: true, status: claim.status }, { status: 201 });
}