export type StudentStatus =
  | "APPLICANT"
  | "ACCEPTED"
  | "ENROLLED"
  | "ACTIVE"
  | "SUSPENDED"
  | "WITHDRAWN"
  | "TRANSFERRED"
  | "GRADUATED"
  | "EXPELLED";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  APPLICANT: "Applicant",
  ACCEPTED: "Accepted",
  ENROLLED: "Enrolled",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  WITHDRAWN: "Withdrawn",
  TRANSFERRED: "Transferred",
  GRADUATED: "Graduated",
  EXPELLED: "Expelled",
};

export const STUDENT_STATUSES = Object.keys(STUDENT_STATUS_LABELS) as StudentStatus[];

/**
 * D1: valid student status transitions — same pattern as
 * src/lib/admissions.ts#canTransitionApplication. Any (from, to) pair
 * not listed here is illegal (e.g. GRADUATED -> APPLICANT,
 * ACTIVE -> APPLICANT) and rejected server-side in the /status route
 * regardless of what the client sends. GRADUATED, TRANSFERRED and
 * EXPELLED are terminal — correcting one of those requires a fresh
 * record, not reopening the old one, so the history stays honest.
 */
const STUDENT_TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  APPLICANT: ["ACCEPTED", "ENROLLED", "WITHDRAWN"],
  ACCEPTED: ["ENROLLED", "WITHDRAWN"],
  ENROLLED: ["ACTIVE", "WITHDRAWN"],
  ACTIVE: ["SUSPENDED", "WITHDRAWN", "TRANSFERRED", "GRADUATED", "EXPELLED"],
  SUSPENDED: ["ACTIVE", "WITHDRAWN", "TRANSFERRED", "EXPELLED"],
  WITHDRAWN: ["ACTIVE"], // re-admission
  TRANSFERRED: [],
  GRADUATED: [],
  EXPELLED: [],
};

export function canTransitionStudent(from: StudentStatus, to: StudentStatus): boolean {
  return STUDENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Matches a spreadsheet "Class" cell against the classes of a single
 * academic year (the caller must already have scoped `classes` to
 * one year — this never resolves across years, since class names are
 * only unique within a year per `@@unique([academicYearId, name])`).
 * Case/whitespace-insensitive, same as the rest of the import's
 * matching. Returns undefined when there's no match — the caller
 * marks that row invalid rather than creating an unassigned student.
 */
export function matchImportClassName(
  className: string,
  classes: { id: string; name: string; academicYearId: string }[]
): { classId: string; academicYearId: string } | undefined {
  const needle = className.trim().toLowerCase();
  const match = classes.find((c) => c.name.trim().toLowerCase() === needle);
  return match ? { classId: match.id, academicYearId: match.academicYearId } : undefined;
}
