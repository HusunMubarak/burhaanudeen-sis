import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { announcementSchema } from "@/lib/validation";
import { slugify, withUniqueSuffix } from "@/lib/slug";

export async function GET() {
  try {
    await requireModuleAccess("website", "read");
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(announcements);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("website", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
    }

    let slug = slugify(parsed.data.title);
    if (await prisma.announcement.findUnique({ where: { slug } })) slug = withUniqueSuffix(slug);

    const announcement = await prisma.announcement.create({
      data: {
        title: parsed.data.title,
        slug,
        body: parsed.data.body,
        category: parsed.data.category ?? "General",
        isPublished: parsed.data.isPublished ?? false,
        isPrivate: parsed.data.isPrivate ?? false,
        publishedAt: parsed.data.isPublished ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "Announcement", entityId: announcement.id },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
