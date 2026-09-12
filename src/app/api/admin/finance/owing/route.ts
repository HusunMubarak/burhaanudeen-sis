import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { listStudentsOwing } from "@/lib/data/finance";
import { getSchoolSettings } from "@/lib/data/settings";
import { generateOwingReportPdf } from "@/lib/pdf/owing-report";

const CSV_COLUMNS = ["Admission Number", "Name", "Class", "Expected", "Paid", "Balance"] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: Request) {
  try {
    await requireModuleAccess("fees", "read");
    const url = new URL(req.url);
    const sp = url.searchParams;
    const format = sp.get("format");

    const params = {
      q: sp.get("q") ?? undefined,
      classId: sp.get("classId") ?? undefined,
      academicYearId: sp.get("academicYearId") ?? undefined,
      termId: sp.get("termId") ?? undefined,
      minBalance: sp.get("minBalance") ? Number(sp.get("minBalance")) : undefined,
      maxBalance: sp.get("maxBalance") ? Number(sp.get("maxBalance")) : undefined,
      sort: (sp.get("sort") as "balance-desc" | "balance-asc" | "name" | "class") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
      // Exports need every matching row, not just one page.
      pageSize: format ? 10_000 : undefined,
    };

    const result = await listStudentsOwing(params);

    if (format === "pdf") {
      const settings = await getSchoolSettings();
      const pdf = await generateOwingReportPdf(settings.name, result.rows, result.totalOwing);
      return new NextResponse(new Uint8Array(pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="students-owing.pdf"` },
      });
    }

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Students Owing");
      sheet.columns = CSV_COLUMNS.map((header) => ({ header, key: header, width: 20 }));
      sheet.addRows(
        result.rows.map((r) => ({
          "Admission Number": r.admissionNumber,
          Name: r.name,
          Class: r.className,
          Expected: r.expected,
          Paid: r.paid,
          Balance: r.balance,
        }))
      );
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="students-owing.xlsx"`,
        },
      });
    }

    if (format === "csv") {
      const lines = [CSV_COLUMNS.join(",")];
      for (const r of result.rows) {
        lines.push(
          [r.admissionNumber, r.name, r.className, r.expected.toFixed(2), r.paid.toFixed(2), r.balance.toFixed(2)]
            .map(csvEscape)
            .join(",")
        );
      }
      return new NextResponse(lines.join("\r\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="students-owing.csv"` },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return authErrorResponse(err);
  }
}
