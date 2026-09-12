import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/settings";
import { rowsToCsv, rowsToExcelBuffer, rowsToPdfBuffer, exportHeaders, type ExportColumn } from "@/lib/export/table-export";
import type { ApplicationStatus, PaymentClaimStatus } from "@prisma/client";

const REPORT_TITLES: Record<string, string> = {
  applications: "All Applications",
  "pending-payments": "Pending Payments",
  "verified-payments": "Verified Payments",
  accepted: "Accepted Applications",
  rejected: "Rejected Applications",
  enrolled: "Enrolled Applications",
};

const COLUMNS: ExportColumn[] = [
  { key: "applicationNumber", header: "Application No.", width: 120 },
  { key: "name", header: "Name" },
  { key: "levelAppliedFor", header: "Level Applied For", width: 130 },
  { key: "status", header: "Status", width: 100 },
  { key: "paymentStatus", header: "Payment Status", width: 120 },
  { key: "date", header: "Submitted", width: 90 },
];

export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("reports", "read");
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "applications";
    const format = (url.searchParams.get("format") ?? "csv") as "csv" | "xlsx" | "pdf";

    let where: Record<string, unknown> = {};
    if (type === "accepted") where = { status: "ACCEPTED" as ApplicationStatus };
    else if (type === "rejected") where = { status: "REJECTED" as ApplicationStatus };
    else if (type === "enrolled") where = { status: "ENROLLED" as ApplicationStatus };
    else if (type === "pending-payments") where = { paymentClaim: { status: "PENDING_VERIFICATION" as PaymentClaimStatus } };
    else if (type === "verified-payments") where = { paymentClaim: { status: "VERIFIED" as PaymentClaimStatus } };

    const applications = await prisma.application.findMany({
      where,
      include: { paymentClaim: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = applications.map((a) => ({
      applicationNumber: a.applicationNumber,
      name: `${a.lastName}, ${a.firstName} ${a.otherNames}`.trim(),
      levelAppliedFor: a.levelAppliedFor,
      status: a.status,
      paymentStatus: a.paymentClaim?.status ?? "NOT_SUBMITTED",
      date: a.createdAt.toISOString().slice(0, 10),
    }));

    const title = REPORT_TITLES[type] ?? "Admissions Report";

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "EXPORT", entity: "AdmissionsReport", metadata: JSON.stringify({ type, format, count: rows.length }) },
    });

    if (format === "pdf") {
      const settings = await getSchoolSettings();
      const pdf = await rowsToPdfBuffer(settings.name, title, COLUMNS, rows);
      return new NextResponse(new Uint8Array(pdf), { headers: exportHeaders("pdf", `admissions-${type}`) });
    }
    if (format === "xlsx") {
      const buffer = await rowsToExcelBuffer(title, COLUMNS, rows);
      return new NextResponse(new Uint8Array(buffer), { headers: exportHeaders("xlsx", `admissions-${type}`) });
    }
    return new NextResponse(rowsToCsv(COLUMNS, rows), { headers: exportHeaders("csv", `admissions-${type}`) });
  } catch (err) {
    return authErrorResponse(err);
  }
}
