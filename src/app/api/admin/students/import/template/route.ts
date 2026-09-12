import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";

export async function GET() {
  try {
    await requireModuleAccess("students", "write");

    const headers = [
      "First Name",
      "Last Name",
      "Other Names",
      "Gender",
      "Date of Birth",
      "Guardian Name",
      "Guardian Phone",
      "Guardian Email",
      "Class",
    ];
    const example = [
      "Amina",
      "Mahama",
      "",
      "Female",
      "2016-04-12",
      "Fatima Mahama",
      "0244000000",
      "",
      "Primary 1",
    ];

    const csv = [headers.join(","), example.join(",")].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="student-import-template.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
