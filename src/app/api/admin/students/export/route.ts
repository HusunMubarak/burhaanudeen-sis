import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireRole, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/settings";
import { generateStudentListPdf } from "@/lib/pdf/student-list";
import { STUDENT_EXPORT_ROLES } from "@/lib/rbac";

const CSV_COLUMNS = [
  "Admission Number",
  "First Name",
  "Last Name",
  "Other Names",
  "Gender",
  "Date of Birth",
  "Class",
  "Status",
  "Guardian Name",
  "Guardian Phone",
  "Guardian Email",
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(rows: Record<(typeof CSV_COLUMNS)[number], string>[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((c) => csvEscape(row[c])).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(req: Request) {
  try {
    // A8: export is a full PII dump — narrower than ordinary
    // students:write access (which also covers create/edit) and never
    // available to Teachers or Admissions Officer regardless of their
    // read access to the module.
    const session = await requireRole(...STUDENT_EXPORT_ROLES);
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "csv";
    const classId = url.searchParams.get("classId") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

    const students = await prisma.student.findMany({
      where: {
        ...(classId ? { classId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: { class: { select: { name: true } } },
      orderBy: { lastName: "asc" },
    });

    const rows = students.map((s) => ({
      "Admission Number": s.admissionNumber,
      "First Name": s.firstName,
      "Last Name": s.lastName,
      "Other Names": s.otherNames,
      Gender: s.gender,
      "Date of Birth": s.dateOfBirth.toISOString().slice(0, 10),
      Class: s.class?.name ?? "",
      Status: s.status,
      "Guardian Name": s.guardianName,
      "Guardian Phone": s.guardianPhone,
      "Guardian Email": s.guardianEmail,
    }));

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT",
        entity: "Student",
        metadata: JSON.stringify({ format, count: students.length, classId, status }),
      },
    });

    if (format === "pdf") {
      const settings = await getSchoolSettings();
      const pdf = await generateStudentListPdf(
        settings.name,
        students.map((s) => ({
          admissionNumber: s.admissionNumber,
          name: `${s.lastName}, ${s.firstName}`,
          className: s.class?.name ?? "—",
          status: s.status,
          guardianPhone: s.guardianPhone,
        }))
      );
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="students.pdf"`,
        },
      });
    }

    // A6: xlsx (a known-vulnerable package) has been removed in favor
    // of exceljs for the Excel format.
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Students");
      sheet.columns = CSV_COLUMNS.map((header) => ({ header, key: header, width: 20 }));
      sheet.addRows(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="students.xlsx"`,
        },
      });
    }

    // Default: CSV, hand-rolled — simple enough not to need a library.
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
