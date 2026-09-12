import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { admissionStatusCheckSchema } from "@/lib/validation";
import { canTransitionApplication, phoneMatches } from "@/lib/admissions";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/public-guard";

const GENERIC_NOT_FOUND = {
  error: "We couldn't find a matching application. Check your application number and guardian phone number.",
};

export async function POST(req: Request) {
  // A5: same budget as a status check — this is a read-then-single-write,
  // not a content-creating endpoint, so it shares the generous limit.
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(ip, "admissions:withdraw", 10);
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
    select: { id: true, guardianPhone: true, status: true },
  });

  if (!application || !phoneMatches(application.guardianPhone, guardianPhone)) {
    return NextResponse.json(GENERIC_NOT_FOUND, { status: 404 });
  }

  if (!canTransitionApplication(application.status, "WITHDRAWN")) {
    return NextResponse.json(
      { error: "This application can no longer be withdrawn — please contact the school office." },
      { status: 409 }
    );
  }

  await prisma.application.update({ where: { id: application.id }, data: { status: "WITHDRAWN" } });

  await prisma.auditLog.create({
    data: {
      action: "WITHDRAW",
      entity: "Application",
      entityId: application.id,
      metadata: JSON.stringify({ source: "public" }),
    },
  });

  return NextResponse.json({ ok: true, status: "WITHDRAWN" });
}
