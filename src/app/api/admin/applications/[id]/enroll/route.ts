import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { enrollmentSchema } from "@/lib/validation";
import { canEnroll, type ApplicationStatus, type PaymentClaimStatus } from "@/lib/admissions";
import { generateStudentAdmissionNumber } from "@/lib/ids";

/** Carries a specific status + message out of the enrollment
 * transaction so the route can return the right response — thrown
 * only for expected, user-facing conditions (not-found, no-longer-
 * eligible, capacity), never for unexpected errors. */
class EnrollmentConflictError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("admissions", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = enrollmentSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Select a class and academic year.", fieldErrors }, { status: 422 });
    }

    // Enrollment never asks the admin to re-enter anything — every
    // field is carried straight over from the application, and the
    // admission number is generated inside this same transaction so a
    // failed insert never burns a number (C7).
    //
    // Everything that decides *whether* to enroll — application
    // status/payment eligibility, "not already enrolled", the class's
    // year, and its remaining capacity — is re-checked here, inside
    // the transaction, against a row-locked class. Two concurrent
    // enroll requests into a nearly-full class therefore cannot both
    // pass the capacity check: Postgres's default READ COMMITTED
    // isolation does not serialize plain SELECTs, so the check has to
    // be done against a row lock, not just "inside a transaction".
    const student = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; name: string; capacity: number; academicYearId: string }[]>`
        SELECT id, name, capacity, "academicYearId" FROM "Class" WHERE id = ${parsed.data.classId} FOR UPDATE
      `;
      const targetClass = locked[0];
      if (!targetClass) throw new EnrollmentConflictError("Selected class not found.", 404);
      if (targetClass.academicYearId !== parsed.data.academicYearId) {
        throw new EnrollmentConflictError("Selected class does not belong to the selected academic year.", 422);
      }

      const application = await tx.application.findUnique({
        where: { id },
        include: { paymentClaim: true, student: true, documents: true },
      });
      if (!application) throw new EnrollmentConflictError("Application not found.", 404);
      if (application.student) throw new EnrollmentConflictError("This application has already been enrolled.", 409);

      const eligibility = canEnroll({
        status: application.status as ApplicationStatus,
        paymentStatus: (application.paymentClaim?.status as PaymentClaimStatus) ?? "NOT_SUBMITTED",
      });
      if (!eligibility.ok) throw new EnrollmentConflictError(eligibility.reason, 409);

      // Occupancy is counted under the row lock acquired above, so a
      // second concurrent enrollment blocks here until this
      // transaction commits or rolls back — it can never read a
      // stale pre-enrollment count.
      const currentCount = await tx.student.count({ where: { classId: targetClass.id } });
      if (currentCount >= targetClass.capacity) {
        throw new EnrollmentConflictError(
          `${targetClass.name} is at capacity (${targetClass.capacity}/${targetClass.capacity}). Choose a different class.`,
          409
        );
      }

      const admissionNumber = await generateStudentAdmissionNumber(new Date().getFullYear(), tx);

      const created = await tx.student.create({
        data: {
          admissionNumber,
          firstName: application.firstName,
          lastName: application.lastName,
          otherNames: application.otherNames,
          gender: application.gender,
          dateOfBirth: application.dateOfBirth,
          nationality: application.nationality,
          address: application.address,
          guardianName: application.guardianName,
          guardianPhone: application.guardianPhone,
          guardianEmail: application.guardianEmail,
          emergencyContactName: application.emergencyContactName,
          emergencyContactPhone: application.emergencyContactPhone,
          previousSchool: application.previousSchool,
          classId: parsed.data.classId,
          academicYearId: parsed.data.academicYearId,
          status: "ACTIVE",
          applicationId: application.id,
        },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId: created.id,
          fromStatus: null,
          toStatus: "ACTIVE",
          note: `Enrolled from application ${application.applicationNumber}`,
          changedById: session.user.id,
        },
      });

      // C7: carry any documents recorded on the application over to
      // the new student record rather than leaving them stranded.
      if (application.documents.length > 0) {
        await tx.studentDocument.createMany({
          data: application.documents.map((d) => ({
            studentId: created.id,
            name: d.name,
            url: d.url,
          })),
        });
      }

      await tx.application.update({ where: { id: application.id }, data: { status: "ENROLLED" } });

      return created;
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ENROLL",
        entity: "Student",
        entityId: student.id,
        metadata: JSON.stringify({ applicationId: id, admissionNumber: student.admissionNumber }),
      },
    });

    return NextResponse.json({ studentId: student.id, admissionNumber: student.admissionNumber }, { status: 201 });
  } catch (err) {
    if (err instanceof EnrollmentConflictError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return authErrorResponse(err);
  }
}
