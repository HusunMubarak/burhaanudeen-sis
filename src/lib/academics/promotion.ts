/**
 * Pure promotion logic — same "no DB imports, directly testable"
 * pattern as grading.ts and lib/finance.ts. The route layer fetches
 * classes/students and calls these to build/validate a promotion
 * batch; nothing here touches Prisma directly.
 *
 * E5: promotion is Prepare -> Review -> Confirm. These functions only
 * ever produce a *suggestion* (Prepare) or a validation result
 * (before Confirm) — nothing here writes to the database or moves a
 * student on its own.
 */

export type SchoolSectionLite = "CRECHE" | "PRIMARY" | "JHS";
export type ClassLite = { id: string; name: string; section: SchoolSectionLite; level: number };
export type PromotionDecision = "PROMOTE" | "RETAIN" | "GRADUATE" | "TRANSFER" | "WITHDRAW";

/**
 * Default suggestion for a single student moving on from `fromClass`:
 * the lowest-level class in the destination year's set with a level
 * greater than fromClass.level (i.e. "the next class up"). If none
 * exists, fromClass is the top of the school (JHS 3) and the
 * suggestion is GRADUATE. This is only ever a starting point — an
 * administrator can override any student's decision individually
 * during Review, and nothing here is applied until Confirm.
 */
export function suggestPromotion(
  fromClass: ClassLite,
  candidatesInTargetYear: ClassLite[]
): { decision: "PROMOTE" | "GRADUATE"; toClassId: string | null } {
  const next = candidatesInTargetYear.filter((c) => c.level > fromClass.level).sort((a, b) => a.level - b.level)[0];
  if (!next) return { decision: "GRADUATE", toClassId: null };
  return { decision: "PROMOTE", toClassId: next.id };
}

export type PromotionRecordLite = { studentId: string; decision: PromotionDecision; toClassId: string | null };

const NEEDS_DESTINATION: PromotionDecision[] = ["PROMOTE", "RETAIN", "TRANSFER"];
const NO_DESTINATION: PromotionDecision[] = ["GRADUATE", "WITHDRAW"];

/** Returns an error message for this one record, or null if it's
 * ready to be confirmed. */
export function validatePromotionRecord(r: PromotionRecordLite): string | null {
  if (NEEDS_DESTINATION.includes(r.decision) && !r.toClassId) {
    return `Student ${r.studentId}: a destination class is required for ${r.decision}`;
  }
  if (NO_DESTINATION.includes(r.decision) && r.toClassId) {
    return `Student ${r.studentId}: ${r.decision} should not have a destination class`;
  }
  return null;
}

/** All validation errors across a batch — empty array means the
 * batch is ready to Confirm. */
export function validatePromotionBatch(records: PromotionRecordLite[]): string[] {
  return records.map(validatePromotionRecord).filter((e): e is string => e !== null);
}

/** Whether a destination class has room for `incomingCount` more
 * students on top of `currentCount` already there. Kept as its own
 * function (rather than inlined at the call site) so the confirm
 * route's capacity check — current occupancy plus however many other
 * records in the same batch also target this class — is unit
 * testable without a database. */
export function hasRemainingCapacity(params: { capacity: number; currentCount: number; incomingCount: number }): boolean {
  return params.currentCount + params.incomingCount <= params.capacity;
}
