import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { applicationReviewSchema } from "@/lib/validation";
import { canTransitionApplication, type ApplicationStatus } from "@/lib/admissions";

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

    const parsed = applicationReviewSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const target = parsed.data.status as ApplicationStatus;
    if (!canTransitionApplication(application.status as ApplicationStatus, target)) {
      return NextResponse.json(
        { error: `Cannot move this application from ${application.status} to ${target}.` },
        { status: 409 }
      );
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: target,
        decisionReason: parsed.data.decisionReason || application.decisionReason,
        adminNotes: parsed.data.adminNotes
          ? `${application.adminNotes ? application.adminNotes + "\n\n" : ""}${parsed.data.adminNotes}`
          : application.adminNotes,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `APPLICATION_${target}`,
        entity: "Application",
        entityId: id,
        metadata: JSON.stringify({ from: application.status, to: target }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
