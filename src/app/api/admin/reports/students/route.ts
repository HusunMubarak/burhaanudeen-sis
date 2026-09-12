import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/settings";
import { rowsToCsv, rowsToExcelBuffer, rowsToPdfBuffer, exportHeaders, type ExportColumn } from "@/lib/export/table-export";
import type { StudentStatus } from "@prisma/client";

const REPORT_TITLES: Record<string, string> = {
  all: "All Students",
  "by-class": "Students by Class",
  "by-gender": "Students by Gender",
  "new-admissions": "New Admissions",
  withdrawals: "Withdrawals",
  graduates: "Graduates",
};

const COLUMNS: ExportColumn[] = [
  { key: "admissionNumber", header: "Admission No.", width: 100 },
  { key: "name", header: "Name" },
  { key: "gender", header: "Gender", width: 70 },
  { key: "className", header: "Class", width: 100 },
  { key: "status", header: "Status", width: 90 },
  { key: "date", header: "Date", width: 90 },
];

/**
 * Every "Students" report category from the Phase 5 spec lives behind
 * one endpoint, distinguished by `type` — a real Report Centre with
 * one route per category would just be this same query repeated six
 * times with a different `where`.
 */
export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("reports", "read");
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "all";
    const format = (url.searchParams.get("format") ?? "csv") as "csv" | "xlsx" | "pdf";
    const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined;
    const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined;

    let where: Record<string, unknown> = {};
    let dateField: "admissionDate" | "updatedAt" = "admissionDate";

    if (type === "new-admissions") {
      dateField = "admissionDate";
      where = { admissionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
    } else if (type === "withdrawals") {
      where = { status: { in: ["WITHDRAWN", "TRANSFERRED", "EXPELLED"] as StudentStatus[] } };
      dateField = "updatedAt";
    } else if (type === "graduates") {
      where = { status: "GRADUATED" as StudentStatus };
      dateField = "updatedAt";
    }

    const students = await prisma.student.findMany({
      where,
      include: { class: { select: { name: true } } },
      orderBy: type === "by-class" ? [{ classId: "asc" }, { lastName: "asc" }] : { lastName: "asc" },
    });

    const rows = students.map((s) => ({
      admissionNumber: s.admissionNumber,
      name: `${s.lastName}, ${s.firstName} ${s.otherNames}`.trim(),
      gender: s.gender,
      className: s.class?.name ?? "—",
      status: s.status,
      date: (dateField === "admissionDate" ? s.admissionDate : s.updatedAt).toISOString().slice(0, 10),
    }));

    const title = REPORT_TITLES[type] ?? "Student Report";

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "EXPORT", entity: "StudentReport", metadata: JSON.stringify({ type, format, count: rows.length }) },
    });

    if (format === "pdf") {
      const settings = await getSchoolSettings();
      const pdf = await rowsToPdfBuffer(settings.name, title, COLUMNS, rows);
      return new NextResponse(new Uint8Array(pdf), { headers: exportHeaders("pdf", `students-${type}`) });
    }
    if (format === "xlsx") {
      const buffer = await rowsToExcelBuffer(title, COLUMNS, rows);
      return new NextResponse(new Uint8Array(buffer), { headers: exportHeaders("xlsx", `students-${type}`) });
    }
    return new NextResponse(rowsToCsv(COLUMNS, rows), { headers: exportHeaders("csv", `students-${type}`) });
  } catch (err) {
    return authErrorResponse(err);
  }
}
