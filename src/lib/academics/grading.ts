/**
 * Pure academic calculation logic (grading, weighted results,
 * attendance percentages) — kept free of Prisma/DB imports so it's
 * directly unit-testable, same pattern as src/lib/finance.ts and
 * src/lib/admissions.ts. Routes fetch the raw rows from the database
 * and pass them in here; nothing in this file trusts a client-supplied
 * total.
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// GRADING (E4: configurable bands, not a hard-coded scale)
// ---------------------------------------------------------------------------

export type GradeBand = { minScore: number; maxScore: number; grade: string; remark: string; isActive: boolean };

export type GradeLookupResult = { grade: string; remark: string } | null;

/**
 * Finds the grade band a percentage score falls into. Bands are
 * inclusive on both ends; inactive bands are ignored. If bands
 * overlap (an admin data-entry mistake), the narrowest matching band
 * wins — the most specific configured range is treated as the
 * intended one rather than picking arbitrarily by list order.
 */
export function gradeFor(score: number, bands: GradeBand[]): GradeLookupResult {
  const matches = bands.filter((b) => b.isActive && score >= b.minScore && score <= b.maxScore);
  if (matches.length === 0) return null;
  const narrowest = matches.reduce((best, b) =>
    b.maxScore - b.minScore < best.maxScore - best.minScore ? b : best
  );
  return { grade: narrowest.grade, remark: narrowest.remark };
}

/** True if any two active bands overlap — used to warn an admin
 * editing the grading configuration, not enforced by the DB. */
export function bandsOverlap(bands: GradeBand[]): boolean {
  const active = bands.filter((b) => b.isActive).sort((a, b) => a.minScore - b.minScore);
  for (let i = 1; i < active.length; i++) {
    if (active[i].minScore <= active[i - 1].maxScore) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// RESULTS — combining several weighted assessments into one subject score
// ---------------------------------------------------------------------------

export type WeightedResult = { score: number; maxScore: number; weight: number };

/**
 * Combines several assessments (each with its own max score and
 * weight) into one overall percentage for a subject/term. Each
 * assessment's score is first normalized to a percentage of its own
 * maxScore, then combined using its weight as a share of the total
 * weight actually present — so a student missing one assessment
 * still gets a fair score computed only from what they sat, rather
 * than being penalized with an implicit zero for the rest of the
 * weight pool.
 */
export function computeOverallScore(results: WeightedResult[]): number {
  const usable = results.filter((r) => r.maxScore > 0 && r.weight > 0);
  const totalWeight = usable.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = usable.reduce((sum, r) => sum + (r.score / r.maxScore) * 100 * r.weight, 0);
  return round2(weightedSum / totalWeight);
}

// ---------------------------------------------------------------------------
// REPORT CARDS — rolling per-assessment rows up into one row per subject
// ---------------------------------------------------------------------------

export type AssessmentResultRow = {
  subjectId: string;
  subjectName: string;
  score: number;
  maxScore: number;
  weight: number;
};

export type SubjectReportRow = {
  subjectId: string;
  subjectName: string;
  overallScore: number;
  grade: string;
  remark: string;
};

/** Groups per-assessment result rows by subject and reduces each
 * subject's assessments to one overall score + grade, ready to print
 * as one line per subject on a report card. */
export function buildSubjectReportRows(rows: AssessmentResultRow[], bands: GradeBand[]): SubjectReportRow[] {
  const bySubject = new Map<string, { subjectName: string; items: WeightedResult[] }>();
  for (const r of rows) {
    const entry = bySubject.get(r.subjectId) ?? { subjectName: r.subjectName, items: [] };
    entry.items.push({ score: r.score, maxScore: r.maxScore, weight: r.weight });
    bySubject.set(r.subjectId, entry);
  }
  return Array.from(bySubject.entries())
    .map(([subjectId, { subjectName, items }]) => {
      const overallScore = computeOverallScore(items);
      const g = gradeFor(overallScore, bands);
      return { subjectId, subjectName, overallScore, grade: g?.grade ?? "-", remark: g?.remark ?? "" };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

/** Simple average of each subject's overall score — the report
 * card's single "overall performance" figure. */
export function computeOverallAverage(subjectRows: { overallScore: number }[]): number {
  if (subjectRows.length === 0) return 0;
  return round2(subjectRows.reduce((sum, r) => sum + r.overallScore, 0) / subjectRows.length);
}

// ---------------------------------------------------------------------------
// ATTENDANCE
// ---------------------------------------------------------------------------

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  /** Percentage of days actually expected to attend (excused days
   * are removed from the denominator — an excused absence should not
   * count against a student's attendance rate) that the student was
   * present or late for. */
  percentage: number;
};

export function summarizeAttendance(records: { status: AttendanceStatus }[]): AttendanceSummary {
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const excused = records.filter((r) => r.status === "EXCUSED").length;
  const total = records.length;
  const expected = total - excused;
  const percentage = expected > 0 ? round2(((present + late) / expected) * 100) : 0;
  return { present, absent, late, excused, total, percentage };
}
