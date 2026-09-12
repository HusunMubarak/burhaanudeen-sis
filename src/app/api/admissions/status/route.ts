import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { admissionStatusCheckSchema } from "@/lib/validation";
import { publicApplicationStatusLabel, phoneMatches, type PaymentClaimStatus } from "@/lib/admissions";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/public-guard";

export async function POST(req: Request) {
  // A5: 10 status checks / 15 min / IP.
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(ip, "admissions:status", 10);
  if (!allowed) return rateLimitResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = admissionStatusCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your application number and guardian phone number." }, { status: 422 });
  }

  const { applicationNumber, guardianPhone } = parsed.data;

  const application = await prisma.application.findUnique({
    where: { applicationNumber: applicationNumber.trim().toUpperCase() },
    include: { paymentClaim: true },
  });

  // Same generic error whether the number doesn't exist or the phone
  // doesn't match — avoids leaking which application numbers are real.
  if (!application || !phoneMatches(application.guardianPhone, guardianPhone)) {
    return NextResponse.json(
      { error: "We couldn't find a matching application. Check your application number and phone number." },
      { status: 404 }
    );
  }

  const paymentStatus: PaymentClaimStatus = application.paymentClaim?.status ?? "NOT_SUBMITTED";

  return NextResponse.json({
    applicationNumber: application.applicationNumber,
    applicantName: `${application.firstName} ${application.lastName}`,
    levelAppliedFor: application.levelAppliedFor,
    submittedAt: application.createdAt,
    // Deliberately excludes adminNotes, decisionReason, reviewedById —
    // see spec "Never expose private administrator notes."
    statusLabel: publicApplicationStatusLabel({ status: application.status, paymentStatus }),
  });
}
