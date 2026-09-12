import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validation";
import { slugify, withUniqueSuffix } from "@/lib/slug";

export async function GET() {
  try {
    await requireModuleAccess("website", "read");
    const events = await prisma.event.findMany({ orderBy: { startsAt: "desc" } });
    return NextResponse.json(events);
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

    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
    }

    let slug = slugify(parsed.data.title);
    if (await prisma.event.findUnique({ where: { slug } })) slug = withUniqueSuffix(slug);

    const event = await prisma.event.create({
      data: {
        title: parsed.data.title,
        slug,
        description: parsed.data.description ?? "",
        location: parsed.data.location ?? "",
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt ?? null,
        isPublished: parsed.data.isPublished ?? false,
      },
    });

    await prisma.auditLog.create({ data: { userId: session.user.id, action: "CREATE", entity: "Event", entityId: event.id } });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
