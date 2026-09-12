import { describe, it, expect } from "vitest";
import {
  gradeFor,
  bandsOverlap,
  computeOverallScore,
  summarizeAttendance,
  buildSubjectReportRows,
  computeOverallAverage,
} from "@/lib/academics/grading";

describe("gradeFor", () => {
  const bands = [
    { minScore: 80, maxScore: 100, grade: "A", remark: "Excellent", isActive: true },
    { minScore: 70, maxScore: 79, grade: "B", remark: "Very Good", isActive: true },
    { minScore: 60, maxScore: 69, grade: "C", remark: "Good", isActive: true },
    { minScore: 0, maxScore: 59, grade: "F", remark: "Fail", isActive: true },
  ];

  it("finds the correct band for a score", () => {
    expect(gradeFor(85, bands)?.grade).toBe("A");
    expect(gradeFor(70, bands)?.grade).toBe("B");
    expect(gradeFor(0, bands)?.grade).toBe("F");
    expect(gradeFor(100, bands)?.grade).toBe("A");
  });

  it("returns null when no band matches", () => {
    expect(gradeFor(150, bands)).toBeNull();
    expect(gradeFor(-5, bands)).toBeNull();
  });

  it("ignores inactive bands", () => {
    const withInactive = [...bands, { minScore: 90, maxScore: 100, grade: "A+", remark: "", isActive: false }];
    expect(gradeFor(95, withInactive)?.grade).toBe("A");
  });

  it("picks the narrowest band when ranges overlap", () => {
    const overlapping = [
      { minScore: 0, maxScore: 100, grade: "PASS", remark: "", isActive: true },
      { minScore: 90, maxScore: 100, grade: "DISTINCTION", remark: "", isActive: true },
    ];
    expect(gradeFor(95, overlapping)?.grade).toBe("DISTINCTION");
  });
});

describe("bandsOverlap", () => {
  it("returns false for non-overlapping bands", () => {
    expect(
      bandsOverlap([
        { minScore: 0, maxScore: 49, grade: "F", remark: "", isActive: true },
        { minScore: 50, maxScore: 100, grade: "P", remark: "", isActive: true },
      ])
    ).toBe(false);
  });

  it("returns true for overlapping active bands", () => {
    expect(
      bandsOverlap([
        { minScore: 0, maxScore: 60, grade: "F", remark: "", isActive: true },
        { minScore: 50, maxScore: 100, grade: "P", remark: "", isActive: true },
      ])
    ).toBe(true);
  });

  it("ignores inactive bands when checking overlap", () => {
    expect(
      bandsOverlap([
        { minScore: 0, maxScore: 60, grade: "F", remark: "", isActive: true },
        { minScore: 50, maxScore: 100, grade: "P", remark: "", isActive: false },
      ])
    ).toBe(false);
  });
});

describe("computeOverallScore", () => {
  it("normalizes each assessment to a percentage before weighting", () => {
    // 40/50 = 80%, weighted 50; 90/100 = 90%, weighted 50 -> average 85%
    const score = computeOverallScore([
      { score: 40, maxScore: 50, weight: 50 },
      { score: 90, maxScore: 100, weight: 50 },
    ]);
    expect(score).toBe(85);
  });

  it("only distributes weight across assessments actually present", () => {
    // Missing one assessment shouldn't silently count as zero.
    const score = computeOverallScore([{ score: 80, maxScore: 100, weight: 60 }]);
    expect(score).toBe(80);
  });

  it("returns 0 when there is nothing usable", () => {
    expect(computeOverallScore([])).toBe(0);
    expect(computeOverallScore([{ score: 10, maxScore: 0, weight: 50 }])).toBe(0);
  });
});

describe("summarizeAttendance", () => {
  it("counts each status and computes a percentage excluding excused days", () => {
    const summary = summarizeAttendance([
      { status: "PRESENT" },
      { status: "PRESENT" },
      { status: "LATE" },
      { status: "ABSENT" },
      { status: "EXCUSED" },
    ]);
    expect(summary).toEqual({
      present: 2,
      absent: 1,
      late: 1,
      excused: 1,
      total: 5,
      // (present + late) / (total - excused) = 3 / 4 = 75%
      percentage: 75,
    });
  });

  it("returns 0% when there are no expected days", () => {
    expect(summarizeAttendance([{ status: "EXCUSED" }]).percentage).toBe(0);
    expect(summarizeAttendance([]).percentage).toBe(0);
  });
});

describe("buildSubjectReportRows / computeOverallAverage", () => {
  it("rolls several assessments per subject into one row with a grade", () => {
    const bands = [
      { minScore: 70, maxScore: 100, grade: "A", remark: "Excellent", isActive: true },
      { minScore: 0, maxScore: 69, grade: "B", remark: "Needs work", isActive: true },
    ];
    const rows = buildSubjectReportRows(
      [
        { subjectId: "s1", subjectName: "Mathematics", score: 80, maxScore: 100, weight: 50 },
        { subjectId: "s1", subjectName: "Mathematics", score: 90, maxScore: 100, weight: 50 },
        { subjectId: "s2", subjectName: "English", score: 30, maxScore: 100, weight: 100 },
      ],
      bands
    );
    expect(rows).toHaveLength(2);
    const math = rows.find((r) => r.subjectId === "s1");
    expect(math?.overallScore).toBe(85);
    expect(math?.grade).toBe("A");
    const english = rows.find((r) => r.subjectId === "s2");
    expect(english?.overallScore).toBe(30);
    expect(english?.grade).toBe("B");

    expect(computeOverallAverage(rows)).toBe(57.5);
  });

  it("returns an empty list and 0 average when there are no results", () => {
    expect(buildSubjectReportRows([], [])).toEqual([]);
    expect(computeOverallAverage([])).toBe(0);
  });
});
