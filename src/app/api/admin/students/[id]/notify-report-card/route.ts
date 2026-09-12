import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { notifyGuardiansOfStudent } from "@/lib/notifications";

/** Lets an admin/teacher tell a student's linked parent account(s)
 * that a report card is ready, once results for the term are final.
 * There's no automatic "results published" event yet (results are
 * entered per-assessment, not published as a batch), so this is a
 * deliberate action rather than something fired on every score entry
 * — which would spam guardians long before a term is actually done. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess("academics", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { termId, academicYearId } = (body ?? {}) as { termId?: string; academicYearId?: string };

    const student = await prisma.student.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const guardianCount = await prisma.guardian.count({ where: { studentId: id } });

    await notifyGuardiansOfStudent(id, {
      type: "REPORT_CARD",
      title: "New report card available",
      body: `${student.firstName} ${student.lastName}'s report card is ready to view.`,
      link: `/parent/students/${id}?termId=${termId ?? ""}&academicYearId=${academicYearId ?? ""}`,
    });

    return NextResponse.json({ ok: true, notified: guardianCount });
  } catch (err) {
    return authErrorResponse(err);
  }
}
