import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { StudentForm } from "@/components/admin/student-form";

export const metadata = { title: "Edit Student" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("students", "write");
  const { id } = await params;

  const [student, classes, years] = await Promise.all([
    prisma.student.findUnique({ where: { id } }),
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);

  if (!student) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Edit Student</h1>
      <p className="mt-1 text-sm text-ink-soft">{student.admissionNumber}</p>
      <div className="mt-6 max-w-3xl">
        <StudentForm
          classes={classes}
          years={years}
          initial={{
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            otherNames: student.otherNames,
            gender: student.gender,
            dateOfBirth: student.dateOfBirth.toISOString().slice(0, 10),
            nationality: student.nationality,
            address: student.address,
            guardianName: student.guardianName,
            guardianPhone: student.guardianPhone,
            guardianEmail: student.guardianEmail,
            emergencyContactName: student.emergencyContactName,
            emergencyContactPhone: student.emergencyContactPhone,
            previousSchool: student.previousSchool,
            classId: student.classId ?? "",
            academicYearId: student.academicYearId ?? "",
            status: student.status,
          }}
        />
      </div>
    </div>
  );
}
