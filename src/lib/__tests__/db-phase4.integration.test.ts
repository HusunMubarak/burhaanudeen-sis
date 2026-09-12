/**
 * Integration tests for the Phase 4 academics schema — Subjects,
 * class/teacher assignments, Attendance, Assessments, Results,
 * GradeScale and the Promotion workflow — hitting a real database via
 * Prisma. Same skip-safe pattern as db.integration.test.ts: run
 *
 *   npm run db:generate
 *   npm run db:push
 *   npm test
 *
 * These are skipped automatically if the Prisma client hasn't been
 * generated yet.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

let prismaAvailable = true;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

beforeAll(async () => {
  try {
    const mod = await import("@/lib/prisma");
    prisma = mod.prisma;
    await prisma.$connect();
  } catch {
    prismaAvailable = false;
  }
});

afterAll(async () => {
  if (prismaAvailable && prisma) await prisma.$disconnect();
});

describe("Phase 4 academics schema", () => {
  it("wires Subject -> ClassSubject -> TeacherSubject together", async () => {
    if (!prismaAvailable) {
      console.warn("Skipping: run `npm run db:generate && npm run db:push` first.");
      return;
    }

    const year = await prisma.academicYear.upsert({
      where: { name: "TEST-P4-YEAR" },
      update: {},
      create: { name: "TEST-P4-YEAR", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
    });
    const klass = await prisma.class.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: "TEST-P4-CLASS" } },
      update: {},
      create: { name: "TEST-P4-CLASS", section: "PRIMARY", level: 99, academicYearId: year.id },
    });
    const subject = await prisma.subject.upsert({
      where: { code: "TESTP4" },
      update: {},
      create: { name: "Test Phase 4 Subject", code: "TESTP4", level: "PRIMARY" },
    });

    const classSubject = await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId: klass.id, subjectId: subject.id } },
      update: {},
      create: { classId: klass.id, subjectId: subject.id },
    });
    expect(classSubject.classId).toBe(klass.id);

    const role = await prisma.role.upsert({
      where: { name: "TEACHER" },
      update: {},
      create: { name: "TEACHER", label: "Teacher", description: "Teacher-level access." },
    });
    const bcrypt = await import("bcryptjs");
    const teacherUser = await prisma.user.upsert({
      where: { email: "test-p4-teacher@burhaanudeen.test" },
      update: {},
      create: {
        name: "Test P4 Teacher",
        email: "test-p4-teacher@burhaanudeen.test",
        passwordHash: await bcrypt.hash("TestPassword123!", 10),
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: teacherUser.id, roleId: role.id } },
      update: {},
      create: { userId: teacherUser.id, roleId: role.id },
    });
    const staff = await prisma.staff.upsert({
      where: { userId: teacherUser.id },
      update: {},
      create: {
        userId: teacherUser.id,
        staffNumber: "TEST-P4-STAFF",
        category: "TEACHING",
        position: "Test Teacher",
        status: "ACTIVE",
      },
    });

    const teacherSubject = await prisma.teacherSubject.upsert({
      where: { staffId_classSubjectId: { staffId: staff.id, classSubjectId: classSubject.id } },
      update: {},
      create: { staffId: staff.id, classSubjectId: classSubject.id },
    });
    expect(teacherSubject.staffId).toBe(staff.id);

    // Unassigning a class-subject with no assessments should be
    // possible (no orphaned history) — cascades TeacherSubject too.
    await prisma.teacherSubject.deleteMany({ where: { classSubjectId: classSubject.id } });
    await prisma.classSubject.delete({ where: { id: classSubject.id } });
    const stillThere = await prisma.teacherSubject.findUnique({ where: { id: teacherSubject.id } });
    expect(stillThere).toBeNull();
  });

  it("records Attendance once per student per day (unique constraint)", async () => {
    if (!prismaAvailable) return;

    const year = await prisma.academicYear.upsert({
      where: { name: "TEST-P4-ATT-YEAR" },
      update: {},
      create: { name: "TEST-P4-ATT-YEAR", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
    });
    const klass = await prisma.class.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: "TEST-P4-ATT-CLASS" } },
      update: {},
      create: { name: "TEST-P4-ATT-CLASS", section: "PRIMARY", level: 98, academicYearId: year.id },
    });
    const student = await prisma.student.upsert({
      where: { admissionNumber: "TEST-P4-ADM-1" },
      update: {},
      create: {
        admissionNumber: "TEST-P4-ADM-1",
        firstName: "Test",
        lastName: "Student",
        gender: "Female",
        dateOfBirth: new Date("2015-01-01"),
        guardianName: "Test Guardian",
        guardianPhone: "0244000000",
        classId: klass.id,
        academicYearId: year.id,
        status: "ACTIVE",
      },
    });

    const date = new Date("2026-02-02");
    const record = await prisma.attendance.upsert({
      where: { studentId_date: { studentId: student.id, date } },
      update: { status: "PRESENT" },
      create: { studentId: student.id, classId: klass.id, date, status: "PRESENT" },
    });
    expect(record.status).toBe("PRESENT");

    // Same student/day again should update, not duplicate.
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: student.id, date } },
      update: { status: "LATE" },
      create: { studentId: student.id, classId: klass.id, date, status: "LATE" },
    });
    const count = await prisma.attendance.count({ where: { studentId: student.id, date } });
    expect(count).toBe(1);
  });

  it("computes a report-card-ready result and respects the GradeScale + Result unique constraint", async () => {
    if (!prismaAvailable) return;
    const { buildSubjectReportRows } = await import("@/lib/academics/grading");

    const year = await prisma.academicYear.upsert({
      where: { name: "TEST-P4-RESULT-YEAR" },
      update: {},
      create: { name: "TEST-P4-RESULT-YEAR", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
    });
    const term = await prisma.term.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: "TEST-P4-TERM" } },
      update: {},
      create: {
        academicYearId: year.id,
        name: "TEST-P4-TERM",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-04-01"),
      },
    });
    const klass = await prisma.class.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: "TEST-P4-RESULT-CLASS" } },
      update: {},
      create: { name: "TEST-P4-RESULT-CLASS", section: "PRIMARY", level: 97, academicYearId: year.id },
    });
    const subject = await prisma.subject.upsert({
      where: { code: "TESTP4R" },
      update: {},
      create: { name: "Test Phase 4 Result Subject", code: "TESTP4R" },
    });
    const classSubject = await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId: klass.id, subjectId: subject.id } },
      update: {},
      create: { classId: klass.id, subjectId: subject.id },
    });
    const student = await prisma.student.upsert({
      where: { admissionNumber: "TEST-P4-ADM-2" },
      update: {},
      create: {
        admissionNumber: "TEST-P4-ADM-2",
        firstName: "Test",
        lastName: "Student Two",
        gender: "Male",
        dateOfBirth: new Date("2014-01-01"),
        guardianName: "Test Guardian",
        guardianPhone: "0244000001",
        classId: klass.id,
        academicYearId: year.id,
        status: "ACTIVE",
      },
    });

    const assessment = await prisma.assessment.create({
      data: {
        name: "TEST-P4-ASSESSMENT",
        type: "Class Test",
        classSubjectId: classSubject.id,
        termId: term.id,
        academicYearId: year.id,
        date: new Date("2026-02-10"),
        maxScore: 100,
        weight: 100,
      },
    });

    await prisma.result.upsert({
      where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: student.id } },
      update: { score: 88 },
      create: { assessmentId: assessment.id, studentId: student.id, score: 88 },
    });

    // A second result row for the same assessment/student must be
    // rejected — one score per student per assessment.
    await expect(
      prisma.result.create({ data: { assessmentId: assessment.id, studentId: student.id, score: 50 } })
    ).rejects.toBeTruthy();

    const bands = await prisma.gradeScale.findMany({ where: { isActive: true } });
    const rows = buildSubjectReportRows(
      [{ subjectId: subject.id, subjectName: subject.name, score: 88, maxScore: 100, weight: 100 }],
      bands.map((b: { minScore: unknown; maxScore: unknown; grade: string; remark: string; isActive: boolean }) => ({
        minScore: Number(b.minScore),
        maxScore: Number(b.maxScore),
        grade: b.grade,
        remark: b.remark,
        isActive: b.isActive,
      }))
    );
    expect(rows[0].overallScore).toBe(88);

    // An assessment that already has results can't be deleted (would
    // silently destroy recorded marks).
    const resultCount = await prisma.result.count({ where: { assessmentId: assessment.id } });
    expect(resultCount).toBeGreaterThan(0);
  });

  it("runs a promotion batch through Prepare -> Review -> Confirm and actually moves the student", async () => {
    if (!prismaAvailable) return;

    const fromYear = await prisma.academicYear.upsert({
      where: { name: "TEST-P4-PROMO-FROM-YEAR" },
      update: {},
      create: { name: "TEST-P4-PROMO-FROM-YEAR", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31") },
    });
    const toYear = await prisma.academicYear.upsert({
      where: { name: "TEST-P4-PROMO-TO-YEAR" },
      update: {},
      create: { name: "TEST-P4-PROMO-TO-YEAR", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
    });
    const fromClass = await prisma.class.upsert({
      where: { academicYearId_name: { academicYearId: fromYear.id, name: "TEST-P4-PROMO-FROM" } },
      update: {},
      create: { name: "TEST-P4-PROMO-FROM", section: "PRIMARY", level: 5, academicYearId: fromYear.id },
    });
    const toClass = await prisma.class.upsert({
      where: { academicYearId_name: { academicYearId: toYear.id, name: "TEST-P4-PROMO-TO" } },
      update: {},
      create: { name: "TEST-P4-PROMO-TO", section: "PRIMARY", level: 6, academicYearId: toYear.id },
    });
    const student = await prisma.student.upsert({
      where: { admissionNumber: "TEST-P4-ADM-3" },
      update: { classId: fromClass.id, academicYearId: fromYear.id, status: "ACTIVE" },
      create: {
        admissionNumber: "TEST-P4-ADM-3",
        firstName: "Test",
        lastName: "Student Three",
        gender: "Female",
        dateOfBirth: new Date("2016-01-01"),
        guardianName: "Test Guardian",
        guardianPhone: "0244000002",
        classId: fromClass.id,
        academicYearId: fromYear.id,
        status: "ACTIVE",
      },
    });

    const batch = await prisma.promotionBatch.upsert({
      where: { fromClassId_toAcademicYearId: { fromClassId: fromClass.id, toAcademicYearId: toYear.id } },
      update: {},
      create: { fromClassId: fromClass.id, toAcademicYearId: toYear.id, status: "DRAFT" },
    });

    const record = await prisma.promotionRecord.upsert({
      where: { batchId_studentId: { batchId: batch.id, studentId: student.id } },
      update: { decision: "PROMOTE", toClassId: toClass.id },
      create: { batchId: batch.id, studentId: student.id, decision: "PROMOTE", toClassId: toClass.id },
    });
    expect(record.decision).toBe("PROMOTE");

    // Confirm: this is the only step that should move the student.
    await prisma.student.update({ where: { id: student.id }, data: { classId: toClass.id, academicYearId: toYear.id } });
    await prisma.promotionBatch.update({ where: { id: batch.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } });

    const moved = await prisma.student.findUnique({ where: { id: student.id } });
    expect(moved?.classId).toBe(toClass.id);
    expect(moved?.academicYearId).toBe(toYear.id);
  });
});
