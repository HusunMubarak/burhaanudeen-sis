import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/authorize";
import { requireResultsAccessForClassSubject } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { assessmentSchema } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        classSubject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        term: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });
    if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

    await requireResultsAccessForClassSubject(assessment.classSubjectId);
    return NextResponse.json(assessment);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.assessment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

    const session = await requireResultsAccessForClassSubject(existing.classSubjectId);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = assessmentSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form and try again." }, { status: 422 });
    }

    const updated = await prisma.assessment.update({ where: { id }, data: parsed.data });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "Assessment", entityId: id },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** Only deletable while no scores have been entered yet — once a
 * result exists it's part of the academic record. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.assessment.findUnique({
      where: { id },
      include: { _count: { select: { results: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

    const session = await requireResultsAccessForClassSubject(existing.classSubjectId);

    if (existing._count.results > 0) {
      return NextResponse.json({ error: "This assessment already has results recorded and can't be deleted." }, { status: 409 });
    }

    await prisma.assessment.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "DELETE", entity: "Assessment", entityId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
