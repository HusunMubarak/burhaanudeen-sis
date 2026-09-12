import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applicationSchema } from "@/lib/validation";
import { generateApplicationNumber } from "@/lib/ids";
import { checkRateLimit, getClientIp, rateLimitResponse, honeypotFilled } from "@/lib/public-guard";
import { isDuplicateApplicant, OPEN_APPLICATION_STATUSES } from "@/lib/admissions";

export async function POST(req: Request) {
  // A5: 5 applications / 15 min / IP.
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(ip, "admissions:apply", 5);
  if (!allowed) return rateLimitResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // A5: bots get a fake success without touching the database.
  if (honeypotFilled(body)) {
    return NextResponse.json({ applicationNumber: "BIS-0000-00000" }, { status: 201 });
  }

  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
  }

  const data = parsed.data;

  // C5: reject a duplicate open application for the same child rather
  // than silently creating a second one — matched on normalized
  // guardian phone + name + DOB, and only against applications that
  // haven't already reached a terminal state.
  const candidates = await prisma.application.findMany({
    where: {
      status: { in: OPEN_APPLICATION_STATUSES },
      firstName: { equals: data.firstName, mode: "insensitive" },
      lastName: { equals: data.lastName, mode: "insensitive" },
      dateOfBirth: data.dateOfBirth,
    },
    select: { id: true, firstName: true, lastName: true, guardianPhone: true },
  });
  const duplicate = candidates.some((c) => isDuplicateApplicant(data, c));
  if (duplicate) {
    return NextResponse.json(
      { error: "An open application already exists for this child. Please check the admission status page, or contact the school office." },
      { status: 409 }
    );
  }

  // C6: the current academic year is attached server-side — the
  // applicant never chooses it.
  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true }, select: { id: true } });

  const applicationNumber = await generateApplicationNumber();

  const application = await prisma.application.create({
    data: {
      applicationNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      otherNames: data.otherNames,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      address: data.address,
      guardianName: data.guardianName,
      guardianPhone: data.guardianPhone,
      guardianEmail: data.guardianEmail,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      previousSchool: data.previousSchool,
      levelAppliedFor: data.levelAppliedFor,
      section: data.section,
      academicYearId: currentYear?.id,
      status: "SUBMITTED",
    },
  });

  return NextResponse.json(
    { applicationNumber: application.applicationNumber },
    { status: 201 }
  );
}
