import { describe, it, expect } from "vitest";
import { roleCanAccessModule } from "@/lib/rbac";
import { isUnrestrictedAcademics } from "@/lib/academics/roles";
import { suggestPromotion } from "@/lib/academics/promotion";

describe("Phase 4: attendance module boundaries", () => {
  it("Teacher and Headteacher can mark attendance (write)", () => {
    expect(roleCanAccessModule("TEACHER", "attendance", "write")).toBe(true);
    expect(roleCanAccessModule("HEADTEACHER", "attendance", "write")).toBe(true);
  });

  it("Teacher can also read attendance (write implies read)", () => {
    expect(roleCanAccessModule("TEACHER", "attendance", "read")).toBe(true);
  });

  it("Proprietor can view attendance dashboards but not mark attendance", () => {
    expect(roleCanAccessModule("PROPRIETOR", "attendance", "read")).toBe(true);
    expect(roleCanAccessModule("PROPRIETOR", "attendance", "write")).toBe(false);
  });

  it("Bursar has no attendance access at all", () => {
    expect(roleCanAccessModule("BURSAR", "attendance", "read")).toBe(false);
    expect(roleCanAccessModule("BURSAR", "attendance", "write")).toBe(false);
  });
});

describe("Phase 4: results stay behind academics write for confirmation-level actions", () => {
  it("only Proprietor/Headteacher/SuperAdmin hold generic academics write", () => {
    expect(roleCanAccessModule("PROPRIETOR", "academics", "write")).toBe(true);
    expect(roleCanAccessModule("HEADTEACHER", "academics", "write")).toBe(true);
    expect(roleCanAccessModule("SUPER_ADMIN", "academics", "write")).toBe(true);
    expect(roleCanAccessModule("TEACHER", "academics", "write")).toBe(false);
  });

  it("a Teacher's academics access is read-only at the module level (per-class-subject write is scoped in requireResultsAccessForClassSubject, not the module matrix)", () => {
    expect(roleCanAccessModule("TEACHER", "academics", "read")).toBe(true);
    expect(roleCanAccessModule("TEACHER", "academics", "write")).toBe(false);
  });
});

describe("isUnrestrictedAcademics", () => {
  it("treats Super Admin, Proprietor and Headteacher as unrestricted", () => {
    expect(isUnrestrictedAcademics(["SUPER_ADMIN"])).toBe(true);
    expect(isUnrestrictedAcademics(["PROPRIETOR"])).toBe(true);
    expect(isUnrestrictedAcademics(["HEADTEACHER"])).toBe(true);
  });

  it("does not treat a Teacher as unrestricted, even alongside another non-privileged role", () => {
    expect(isUnrestrictedAcademics(["TEACHER"])).toBe(false);
    expect(isUnrestrictedAcademics(["TEACHER", "BURSAR"])).toBe(false);
  });

  it("is unrestricted if ANY held role qualifies", () => {
    expect(isUnrestrictedAcademics(["TEACHER", "PROPRIETOR"])).toBe(true);
  });
});

describe("E5: promotion never happens automatically — suggestPromotion only proposes", () => {
  it("a suggestion is not itself a promotion — no student is moved by calling it", () => {
    const fromClass = { id: "jhs3", name: "JHS 3", section: "JHS" as const, level: 11 };
    const result = suggestPromotion(fromClass, []);
    // Purely a data shape describing a proposal, not an action.
    expect(result).toEqual({ decision: "GRADUATE", toClassId: null });
    expect(typeof result).toBe("object");
  });
});
