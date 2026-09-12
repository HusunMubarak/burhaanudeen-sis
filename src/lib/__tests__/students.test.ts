import { describe, it, expect } from "vitest";
import { canTransitionStudent, STUDENT_STATUSES, matchImportClassName } from "@/lib/students";

describe("canTransitionStudent", () => {
  it("rejects the illegal jumps named in the hardening review", () => {
    expect(canTransitionStudent("GRADUATED", "APPLICANT")).toBe(false);
    expect(canTransitionStudent("ACTIVE", "APPLICANT")).toBe(false);
  });

  it("allows the ordinary enrollment progression", () => {
    expect(canTransitionStudent("APPLICANT", "ACCEPTED")).toBe(true);
    expect(canTransitionStudent("ACCEPTED", "ENROLLED")).toBe(true);
    expect(canTransitionStudent("ENROLLED", "ACTIVE")).toBe(true);
  });

  it("allows an active student to move to any of the standard exit statuses", () => {
    expect(canTransitionStudent("ACTIVE", "SUSPENDED")).toBe(true);
    expect(canTransitionStudent("ACTIVE", "WITHDRAWN")).toBe(true);
    expect(canTransitionStudent("ACTIVE", "TRANSFERRED")).toBe(true);
    expect(canTransitionStudent("ACTIVE", "GRADUATED")).toBe(true);
    expect(canTransitionStudent("ACTIVE", "EXPELLED")).toBe(true);
  });

  it("allows a suspended student to be reinstated", () => {
    expect(canTransitionStudent("SUSPENDED", "ACTIVE")).toBe(true);
  });

  it("allows a withdrawn student to be re-admitted, but nothing else", () => {
    expect(canTransitionStudent("WITHDRAWN", "ACTIVE")).toBe(true);
    expect(canTransitionStudent("WITHDRAWN", "ENROLLED")).toBe(false);
    expect(canTransitionStudent("WITHDRAWN", "APPLICANT")).toBe(false);
  });

  it("treats GRADUATED, TRANSFERRED and EXPELLED as terminal — no transitions out", () => {
    for (const from of ["GRADUATED", "TRANSFERRED", "EXPELLED"] as const) {
      for (const to of STUDENT_STATUSES) {
        expect(canTransitionStudent(from, to)).toBe(false);
      }
    }
  });

  it("rejects every status jumping straight to APPLICANT (a student is never un-applied)", () => {
    for (const from of STUDENT_STATUSES) {
      expect(canTransitionStudent(from, "APPLICANT")).toBe(false);
    }
  });
});

describe("matchImportClassName", () => {
  const currentYearClasses = [
    { id: "cls-p1-2027", name: "Primary 1", academicYearId: "year-2027" },
    { id: "cls-p2-2027", name: "Primary 2", academicYearId: "year-2027" },
  ];

  it("matches case-insensitively and trims whitespace", () => {
    expect(matchImportClassName("primary 1", currentYearClasses)).toEqual({
      classId: "cls-p1-2027",
      academicYearId: "year-2027",
    });
    expect(matchImportClassName("  PRIMARY 1  ", currentYearClasses)).toEqual({
      classId: "cls-p1-2027",
      academicYearId: "year-2027",
    });
  });

  it("returns undefined when the class name isn't in the given (already year-scoped) list", () => {
    expect(matchImportClassName("Primary 1", [])).toBeUndefined();
    expect(matchImportClassName("Primary 9", currentYearClasses)).toBeUndefined();
  });

  it("never matches a same-named class from a different year — the caller must pre-scope the list", () => {
    // Conceptually: if "Primary 1" also exists in a prior year, the
    // caller is responsible for only passing this year's classes in.
    // Given a correctly-scoped list, the match's academicYearId is
    // always the year the caller scoped to.
    const onlyThisYear = currentYearClasses.filter((c) => c.academicYearId === "year-2027");
    const match = matchImportClassName("Primary 1", onlyThisYear);
    expect(match?.academicYearId).toBe("year-2027");
  });
});
