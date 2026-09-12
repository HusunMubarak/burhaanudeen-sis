import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { documentSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("admissions", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = documentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a document name." }, { status: 422 });
    }

    const application = await prisma.application.findUnique({ where: { id }, select: { id: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const doc = await prisma.applicationDocument.create({
      data: { applicationId: id, name: parsed.data.name, url: parsed.data.url },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "ADD_DOCUMENT", entity: "Application", entityId: id },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
