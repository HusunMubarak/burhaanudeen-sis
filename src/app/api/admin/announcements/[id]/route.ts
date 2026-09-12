import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { announcementSchema } from "@/lib/validation";

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

    const parsed = announcementSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
    }

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });

    const willPublish = parsed.data.isPublished ?? existing.isPublished;

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...parsed.data,
        publishedAt: willPublish && !existing.publishedAt ? new Date() : existing.publishedAt,
      },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "Announcement", entityId: id },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("website", "write");
    const { id } = await params;
    await prisma.announcement.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "DELETE", entity: "Announcement", entityId: id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
