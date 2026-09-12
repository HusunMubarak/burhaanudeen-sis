import { describe, it, expect } from "vitest";
import { suggestPromotion, validatePromotionRecord, validatePromotionBatch, hasRemainingCapacity } from "@/lib/academics/promotion";
import type { ClassLite } from "@/lib/academics/promotion";

describe("suggestPromotion", () => {
  const primary3: ClassLite = { id: "p3", name: "Primary 3", section: "PRIMARY", level: 5 };
  const jhs3: ClassLite = { id: "j3", name: "JHS 3", section: "JHS", level: 11 };

  it("suggests the next class up when one exists", () => {
    const candidates: ClassLite[] = [
      { id: "p2", name: "Primary 2", section: "PRIMARY", level: 4 },
      { id: "p4", name: "Primary 4", section: "PRIMARY", level: 6 },
      { id: "p5", name: "Primary 5", section: "PRIMARY", level: 7 },
    ];
    expect(suggestPromotion(primary3, candidates)).toEqual({ decision: "PROMOTE", toClassId: "p4" });
  });

  it("suggests GRADUATE when there is no higher-level class (top of school)", () => {
    const candidates: ClassLite[] = [
      { id: "j1", name: "JHS 1", section: "JHS", level: 9 },
      { id: "j2", name: "JHS 2", section: "JHS", level: 10 },
    ];
    expect(suggestPromotion(jhs3, candidates)).toEqual({ decision: "GRADUATE", toClassId: null });
  });

  it("picks the lowest qualifying level when several classes are above", () => {
    const candidates: ClassLite[] = [
      { id: "p6", name: "Primary 6", section: "PRIMARY", level: 8 },
      { id: "p4", name: "Primary 4", section: "PRIMARY", level: 6 },
    ];
    expect(suggestPromotion(primary3, candidates)).toEqual({ decision: "PROMOTE", toClassId: "p4" });
  });
});

describe("validatePromotionRecord / validatePromotionBatch", () => {
  it("requires a destination class for PROMOTE/RETAIN/TRANSFER", () => {
    expect(validatePromotionRecord({ studentId: "s1", decision: "PROMOTE", toClassId: null })).toMatch(/destination/);
    expect(validatePromotionRecord({ studentId: "s1", decision: "RETAIN", toClassId: null })).toMatch(/destination/);
    expect(validatePromotionRecord({ studentId: "s1", decision: "TRANSFER", toClassId: null })).toMatch(/destination/);
    expect(validatePromotionRecord({ studentId: "s1", decision: "PROMOTE", toClassId: "c1" })).toBeNull();
  });

  it("forbids a destination class for GRADUATE/WITHDRAW", () => {
    expect(validatePromotionRecord({ studentId: "s1", decision: "GRADUATE", toClassId: "c1" })).toMatch(
      /should not have/
    );
    expect(validatePromotionRecord({ studentId: "s1", decision: "WITHDRAW", toClassId: "c1" })).toMatch(
      /should not have/
    );
    expect(validatePromotionRecord({ studentId: "s1", decision: "GRADUATE", toClassId: null })).toBeNull();
  });

  it("collects errors across a whole batch, empty when all valid", () => {
    const errors = validatePromotionBatch([
      { studentId: "s1", decision: "PROMOTE", toClassId: "c1" },
      { studentId: "s2", decision: "PROMOTE", toClassId: null },
      { studentId: "s3", decision: "GRADUATE", toClassId: null },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("s2");

    expect(
      validatePromotionBatch([
        { studentId: "s1", decision: "PROMOTE", toClassId: "c1" },
        { studentId: "s3", decision: "GRADUATE", toClassId: null },
      ])
    ).toEqual([]);
  });
});

describe("hasRemainingCapacity", () => {
  it("allows the move when current + incoming fits exactly at capacity", () => {
    expect(hasRemainingCapacity({ capacity: 40, currentCount: 38, incomingCount: 2 })).toBe(true);
  });

  it("rejects the move when current + incoming would exceed capacity", () => {
    expect(hasRemainingCapacity({ capacity: 40, currentCount: 39, incomingCount: 2 })).toBe(false);
  });

  it("accounts for every other record in the same batch targeting the class, not just one", () => {
    // Ten students already in the class, capacity 40 — five more from
    // this batch fits; fifteen more would not.
    expect(hasRemainingCapacity({ capacity: 40, currentCount: 10, incomingCount: 5 })).toBe(true);
    expect(hasRemainingCapacity({ capacity: 40, currentCount: 10, incomingCount: 31 })).toBe(false);
  });

  it("treats an already-full class with zero incoming as fine, but any incoming as overflow", () => {
    expect(hasRemainingCapacity({ capacity: 40, currentCount: 40, incomingCount: 0 })).toBe(true);
    expect(hasRemainingCapacity({ capacity: 40, currentCount: 40, incomingCount: 1 })).toBe(false);
  });
});
