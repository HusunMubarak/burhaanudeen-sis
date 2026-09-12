import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse, ForbiddenError } from "@/lib/authorize";
import { isUnrestrictedAcademics, getStaffIdForUser, getTeacherAttendanceClassIds } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/settings";
import { buildSubjectReportRows, computeOverallAverage, gradeFor, summarizeAttendance } from "@/lib/academics/grading";
import { generateReportCardPdf } from "@/lib/pdf/report-card";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("academics", "read");
    const { id: studentId } = await params;
    const { searchParams } = new URL(req.url);
    const termId = searchParams.get("termId");
    const academicYearId = searchParams.get("academicYearId");
    if (!termId || !academicYearId) {
      return NextResponse.json({ error: "termId and academicYearId are required." }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { select: { id: true, name: true } } },
    });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const roles = session.user.roles ?? [];
    if (!isUnrestrictedAcademics(roles)) {
      const staffId = await getStaffIdForUser(session.user.id);
      const allowedClassIds = staffId ? await getTeacherAttendanceClassIds(staffId) : [];
      if (!student.classId || !allowedClassIds.includes(student.classId)) {
        throw new ForbiddenError("You are not assigned to this student's class.");
      }
    }

    const [term, academicYear, settings, gradeScales] = await Promise.all([
      prisma.term.findUnique({ where: { id: termId }, select: { id: true, name: true, startDate: true, endDate: true } }),
      prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true, name: true } }),
      getSchoolSettings(),
      prisma.gradeScale.findMany({ where: { isActive: true } }),
    ]);
    if (!term) return NextResponse.json({ error: "Term not found." }, { status: 404 });
    if (!academicYear) return NextResponse.json({ error: "Academic year not found." }, { status: 404 });

    const results = await prisma.result.findMany({
      where: {
        studentId,
        assessment: { termId, academicYearId },
      },
      include: {
        assessment: {
          select: {
            maxScore: true,
            weight: true,
            classSubject: { select: { subjectId: true, subject: { select: { name: true } } } },
          },
        },
      },
    });

    const resultRows = results.map((r) => ({
      subjectId: r.assessment.classSubject.subjectId,
      subjectName: r.assessment.classSubject.subject.name,
      score: Number(r.score),
      maxScore: Number(r.assessment.maxScore),
      weight: Number(r.assessment.weight),
    }));

    const bands = gradeScales.map((s) => ({
      minScore: Number(s.minScore),
      maxScore: Number(s.maxScore),
      grade: s.grade,
      remark: s.remark,
      isActive: s.isActive,
    }));

    const subjectRows = buildSubjectReportRows(resultRows, bands);
    const overallAverage = computeOverallAverage(subjectRows);
    const overallGrade = gradeFor(overallAverage, bands)?.grade ?? "-";

    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId, termId },
      select: { status: true },
    });
    const attendance = summarizeAttendance(attendanceRecords);

    const pdf = await generateReportCardPdf({
      schoolName: settings.name,
      schoolAddress: settings.address,
      schoolPhone: settings.phone,
      schoolEmail: settings.email,
      logoUrl: settings.logoUrl,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber ?? "-",
      className: student.class?.name ?? "-",
      academicYearName: academicYear.name,
      termName: term.name,
      subjectRows,
      overallAverage,
      overallGrade,
      attendance,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="report-card-${student.admissionNumber ?? student.id}-${term.name}.pdf"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
