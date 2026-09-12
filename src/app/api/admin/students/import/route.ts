import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { studentImportRowSchema } from "@/lib/validation";
import { generateStudentAdmissionNumber } from "@/lib/ids";
import { matchImportClassName } from "@/lib/students";

// A6: xlsx (a known-vulnerable package) has been removed. CSV covers
// the school's actual need and opens fine in Excel — see the
// downloadable template at /api/admin/students/import/template.
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 500; // D4

type ParsedRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  valid: boolean;
  errors: string[];
  data?: {
    firstName: string;
    lastName: string;
    otherNames: string;
    gender: "Male" | "Female";
    dateOfBirth: Date;
    guardianName: string;
    guardianPhone: string;
    guardianEmail: string;
    className: string;
  };
};

/** Minimal RFC 4180 CSV parser — handles quoted fields, escaped
 * quotes, and commas/newlines inside quotes. No external dependency
 * needed for a format this simple, and it avoids pulling in another
 * package purely for parsing. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function normalizePhone(v: string) {
  return v.replace(/\D/g, "");
}

async function parseAndValidate(file: File): Promise<{ rows: ParsedRow[]; error?: string }> {
  if (file.size > MAX_FILE_BYTES) {
    return { rows: [], error: "File is too large — the limit is 2 MB." };
  }

  const text = await file.text();
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], error: "The file is empty." };
  }

  const headers = table[0].map((h) => h.trim());
  const dataRows = table.slice(1);

  if (dataRows.length > MAX_ROWS) {
    return { rows: [], error: `Too many rows — the limit is ${MAX_ROWS} per import.` };
  }

  const col = (row: string[], name: string) => {
    const idx = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    return idx === -1 ? "" : (row[idx] ?? "").trim();
  };

  const rows: ParsedRow[] = dataRows.map((row, i) => {
    const normalized = {
      firstName: col(row, "First Name"),
      lastName: col(row, "Last Name"),
      otherNames: col(row, "Other Names"),
      gender: col(row, "Gender"),
      dateOfBirth: col(row, "Date of Birth"),
      guardianName: col(row, "Guardian Name"),
      guardianPhone: col(row, "Guardian Phone"),
      guardianEmail: col(row, "Guardian Email"),
      className: col(row, "Class"),
    };

    const parsed = studentImportRowSchema.safeParse(normalized);
    if (!parsed.success) {
      return {
        rowNumber: i + 2, // +1 for 0-index, +1 for header row
        raw: normalized,
        valid: false,
        errors: parsed.error.issues.map((iss) => `${String(iss.path[0])}: ${iss.message}`),
      };
    }
    return { rowNumber: i + 2, raw: normalized, valid: true, errors: [], data: parsed.data };
  });

  return { rows };
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("students", "write");

    const form = await req.formData();
    const file = form.get("file");
    const action = String(form.get("action") ?? "preview");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const { rows, error: parseError } = await parseAndValidate(file);
    if (parseError) {
      return NextResponse.json({ error: parseError }, { status: 422 });
    }

    // D4/Phase 5 review fix: classes are matched against the *current*
    // academic year only — class names are unique per year
    // (@@unique([academicYearId, name])), so matching globally by
    // name risked assigning a student to the wrong year's "Primary 1"
    // if the name recurred. A row naming a class that doesn't exist
    // in the current year is marked invalid rather than silently
    // creating an unassigned (or wrong-year) student.
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    if (!currentYear) {
      return NextResponse.json(
        { error: "No current academic year is set. Set one before importing students." },
        { status: 422 }
      );
    }

    const classes = await prisma.class.findMany({
      where: { academicYearId: currentYear.id },
      select: { id: true, name: true, academicYearId: true },
    });

    // D4: duplicate check — an existing ACTIVE-ish student with the
    // same name + DOB + guardian phone is treated as "already in the
    // system", not re-imported as a second record.
    const existingStudents = await prisma.student.findMany({
      select: { firstName: true, lastName: true, dateOfBirth: true, guardianPhone: true },
    });
    const existingKey = (s: { firstName: string; lastName: string; dateOfBirth: Date; guardianPhone: string }) =>
      `${s.firstName.trim().toLowerCase()}|${s.lastName.trim().toLowerCase()}|${s.dateOfBirth.toISOString().slice(0, 10)}|${normalizePhone(s.guardianPhone)}`;
    const existingKeys = new Set(existingStudents.map(existingKey));

    const finalRows = rows.map((row) => {
      if (!row.valid || !row.data) return row;

      if (row.data.className && !matchImportClassName(row.data.className, classes)) {
        return {
          ...row,
          valid: false,
          errors: [`className: "${row.data.className}" does not match any class in the current academic year (${currentYear.name})`],
        };
      }

      const key = `${row.data.firstName.trim().toLowerCase()}|${row.data.lastName.trim().toLowerCase()}|${row.data.dateOfBirth.toISOString().slice(0, 10)}|${normalizePhone(row.data.guardianPhone)}`;
      if (existingKeys.has(key)) {
        return { ...row, valid: false, errors: ["This student (matching name, date of birth and guardian phone) already exists."] };
      }

      return row;
    });

    if (action === "preview") {
      return NextResponse.json({
        rows: finalRows,
        summary: {
          total: finalRows.length,
          valid: finalRows.filter((r) => r.valid).length,
          invalid: finalRows.filter((r) => !r.valid).length,
        },
      });
    }

    // D4: the whole batch is one transaction — a failure partway
    // through rolls back everything rather than leaving the school
    // with a half-imported roster.
    const validRows = finalRows.filter((r) => r.valid && r.data);
    const failures = finalRows.filter((r) => !r.valid || !r.data).map((r) => ({ rowNumber: r.rowNumber, errors: r.errors }));

    const created = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of validRows) {
        const data = row.data!;
        const admissionNumber = await generateStudentAdmissionNumber(new Date().getFullYear(), tx);
        const match = data.className ? matchImportClassName(data.className, classes) : undefined;

        const student = await tx.student.create({
          data: {
            admissionNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            otherNames: data.otherNames,
            gender: data.gender,
            dateOfBirth: data.dateOfBirth,
            guardianName: data.guardianName,
            guardianPhone: data.guardianPhone,
            guardianEmail: data.guardianEmail,
            classId: match?.classId ?? null,
            // Phase 5 review fix: never leave academicYearId null when
            // classId is set — set both from the same matched class,
            // same as manual create and enrollment.
            academicYearId: match?.academicYearId ?? null,
            status: "ACTIVE",
          },
        });
        await tx.studentStatusHistory.create({
          data: {
            studentId: student.id,
            fromStatus: null,
            toStatus: "ACTIVE",
            note: "Created via CSV import",
            changedById: session.user.id,
          },
        });
        count += 1;
      }
      return count;
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "IMPORT",
        entity: "Student",
        metadata: JSON.stringify({ created, failed: failures.length }),
      },
    });

    return NextResponse.json({ created, failed: failures.length, failures });
  } catch (err) {
    return authErrorResponse(err);
  }
}
