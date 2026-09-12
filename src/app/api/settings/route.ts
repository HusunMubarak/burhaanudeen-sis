import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/data/settings";
import { schoolSettingsSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Phase 5 review fix: was requireRole("PROPRIETOR") directly,
    // which didn't line up with rbac.ts's settings module (write:
    // ["PROPRIETOR"], SUPER_ADMIN implicit) — a SUPER_ADMIN could see
    // every other admin page but got a 403 here. requireModuleAccess
    // reads the same matrix every other settings-gated route already
    // uses, without widening who's allowed.
    await requireModuleAccess("settings", "read");
    const settings = await getSchoolSettings();
    return NextResponse.json(settings);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireModuleAccess("settings", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = schoolSettingsSchema.partial().safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const updated = await updateSchoolSettings(parsed.data, session.user.id);

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "SchoolSettings",
        entityId: updated.id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
