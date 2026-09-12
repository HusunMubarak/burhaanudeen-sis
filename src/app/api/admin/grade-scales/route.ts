import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { gradeScaleSchema } from "@/lib/validation";
import { bandsOverlap } from "@/lib/academics/grading";

export async function GET() {
  try {
    await requireModuleAccess("academics", "read");
    const scales = await prisma.gradeScale.findMany({ orderBy: { minScore: "asc" } });
    return NextResponse.json(scales);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("academics", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = gradeScaleSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const existingScales = await prisma.gradeScale.findMany({ where: { isActive: true } });
    const wouldOverlap = bandsOverlap([
      ...existingScales.map((s) => ({
        minScore: Number(s.minScore),
        maxScore: Number(s.maxScore),
        grade: s.grade,
        remark: s.remark,
        isActive: s.isActive,
      })),
      { ...parsed.data, remark: parsed.data.remark ?? "" },
    ]);
    if (wouldOverlap) {
      return NextResponse.json(
        { error: "This range overlaps an existing active grade band.", fieldErrors: { minScore: "Overlaps another band" } },
        { status: 409 }
      );
    }

    const created = await prisma.gradeScale.create({ data: parsed.data });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "GradeScale", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
