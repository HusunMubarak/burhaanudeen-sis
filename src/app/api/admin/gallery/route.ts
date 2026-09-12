import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { galleryImageSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireModuleAccess("website", "read");
    const images = await prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(images);
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

    const parsed = galleryImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
    }

    const image = await prisma.galleryImage.create({ data: parsed.data });

    await prisma.auditLog.create({ data: { userId: session.user.id, action: "CREATE", entity: "GalleryImage", entityId: image.id } });

    return NextResponse.json(image, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
