import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess("payroll", "read");
    const { id } = await params;

    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        entries: {
          include: { staff: { select: { id: true, staffNumber: true, position: true, user: { select: { name: true } } } } },
          orderBy: { staff: { user: { name: "asc" } } },
        },
        expense: true,
      },
    });

    if (!period) return NextResponse.json({ error: "Payroll period not found." }, { status: 404 });
    return NextResponse.json(period);
  } catch (err) {
    return authErrorResponse(err);
  }
}
