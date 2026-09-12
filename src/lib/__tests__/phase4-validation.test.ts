import { describe, it, expect } from "vitest";
import {
  subjectSchema,
  classSubjectSchema,
  teacherSubjectSchema,
  attendanceBulkSchema,
  assessmentSchema,
  resultsBulkSchema,
  gradeScaleSchema,
  promotionBatchCreateSchema,
  promotionRecordUpdateSchema,
} from "@/lib/validation";

describe("subjectSchema", () => {
  it("accepts a valid subject", () => {
    const result = subjectSchema.safeParse({ name: "Mathematics", code: "MATH", level: "PRIMARY" });
    expect(result.success).toBe(true);
  });

  it("allows level to be omitted (applies to every section)", () => {
    const result = subjectSchema.safeParse({ name: "Mathematics", code: "MATH" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name or code", () => {
    expect(subjectSchema.safeParse({ name: "", code: "MATH" }).success).toBe(false);
    expect(subjectSchema.safeParse({ name: "Mathematics", code: "" }).success).toBe(false);
  });
});

describe("classSubjectSchema / teacherSubjectSchema", () => {
  it("requires both ids", () => {
    expect(classSubjectSchema.safeParse({ classId: "c1", subjectId: "s1" }).success).toBe(true);
    expect(classSubjectSchema.safeParse({ classId: "", subjectId: "s1" }).success).toBe(false);
    expect(teacherSubjectSchema.safeParse({ staffId: "t1", classSubjectId: "cs1" }).success).toBe(true);
    expect(teacherSubjectSchema.safeParse({ staffId: "", classSubjectId: "cs1" }).success).toBe(false);
  });
});

describe("attendanceBulkSchema", () => {
  const base = {
    classId: "c1",
    date: new Date().toISOString().slice(0, 10),
    entries: [{ studentId: "s1", status: "PRESENT" }],
  };

  it("accepts a valid bulk submission", () => {
    expect(attendanceBulkSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty entries list", () => {
    expect(attendanceBulkSchema.safeParse({ ...base, entries: [] }).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(
      attendanceBulkSchema.safeParse({ ...base, entries: [{ studentId: "s1", status: "ON_LEAVE" }] }).success
    ).toBe(false);
  });

  it("rejects a date far in the future", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(attendanceBulkSchema.safeParse({ ...base, date: future.toISOString() }).success).toBe(false);
  });
});

describe("assessmentSchema", () => {
  const base = {
    name: "Mid-Term Test",
    type: "Mid-Term",
    classSubjectId: "cs1",
    termId: "t1",
    academicYearId: "y1",
    date: new Date().toISOString(),
  };

  it("accepts a valid assessment and defaults maxScore/weight", () => {
    const result = assessmentSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxScore).toBe(100);
      expect(result.data.weight).toBe(100);
    }
  });

  it("allows a configurable free-text type, not a fixed enum", () => {
    expect(assessmentSchema.safeParse({ ...base, type: "Oral Presentation" }).success).toBe(true);
  });

  it("rejects a missing name or class-subject", () => {
    expect(assessmentSchema.safeParse({ ...base, name: "" }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...base, classSubjectId: "" }).success).toBe(false);
  });
});

describe("resultsBulkSchema", () => {
  it("accepts a valid set of scores", () => {
    expect(resultsBulkSchema.safeParse({ entries: [{ studentId: "s1", score: 85 }] }).success).toBe(true);
  });

  it("rejects a negative score", () => {
    expect(resultsBulkSchema.safeParse({ entries: [{ studentId: "s1", score: -1 }] }).success).toBe(false);
  });

  it("rejects an empty entries list", () => {
    expect(resultsBulkSchema.safeParse({ entries: [] }).success).toBe(false);
  });
});

describe("gradeScaleSchema", () => {
  it("accepts a valid band", () => {
    expect(gradeScaleSchema.safeParse({ minScore: 80, maxScore: 100, grade: "A" }).success).toBe(true);
  });

  it("rejects minScore >= maxScore", () => {
    expect(gradeScaleSchema.safeParse({ minScore: 80, maxScore: 80, grade: "A" }).success).toBe(false);
    expect(gradeScaleSchema.safeParse({ minScore: 90, maxScore: 80, grade: "A" }).success).toBe(false);
  });
});

describe("promotionBatchCreateSchema / promotionRecordUpdateSchema", () => {
  it("requires both class and destination year to prepare a batch", () => {
    expect(promotionBatchCreateSchema.safeParse({ fromClassId: "c1", toAcademicYearId: "y1" }).success).toBe(true);
    expect(promotionBatchCreateSchema.safeParse({ fromClassId: "", toAcademicYearId: "y1" }).success).toBe(false);
  });

  it("requires a destination class for PROMOTE/RETAIN/TRANSFER", () => {
    expect(promotionRecordUpdateSchema.safeParse({ decision: "PROMOTE", toClassId: "c1" }).success).toBe(true);
    expect(promotionRecordUpdateSchema.safeParse({ decision: "PROMOTE", toClassId: null }).success).toBe(false);
    expect(promotionRecordUpdateSchema.safeParse({ decision: "RETAIN" }).success).toBe(false);
  });

  it("allows GRADUATE/WITHDRAW without a destination class", () => {
    expect(promotionRecordUpdateSchema.safeParse({ decision: "GRADUATE" }).success).toBe(true);
    expect(promotionRecordUpdateSchema.safeParse({ decision: "WITHDRAW", toClassId: null }).success).toBe(true);
  });
});
