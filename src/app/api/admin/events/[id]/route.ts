import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("website", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = eventSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
    }

    const updated = await prisma.event.update({ where: { id }, data: parsed.data });

    await prisma.auditLog.create({ data: { userId: session.user.id, action: "UPDATE", entity: "Event", entityId: id } });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("website", "write");
    const { id } = await params;
    await prisma.event.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "DELETE", entity: "Event", entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
