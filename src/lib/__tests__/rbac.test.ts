import { describe, it, expect } from "vitest";
import {
  roleCanAccessModule,
  anyRoleCanAccessModule,
  visibleModulesFor,
  MODULES,
  MODULE_LABELS,
  ROLE_NAMES,
  ROLE_LABELS,
} from "@/lib/rbac";

describe("rbac", () => {
  it("SUPER_ADMIN can access every module", () => {
    for (const mod of MODULES) {
      expect(roleCanAccessModule("SUPER_ADMIN", mod)).toBe(true);
    }
  });

  it("PARENT has no admin module access in Phase 1", () => {
    for (const mod of MODULES) {
      expect(roleCanAccessModule("PARENT", mod)).toBe(false);
    }
  });

  it("only PROPRIETOR (and SUPER_ADMIN) can access settings", () => {
    expect(roleCanAccessModule("PROPRIETOR", "settings")).toBe(true);
    expect(roleCanAccessModule("SUPER_ADMIN", "settings")).toBe(true);
    expect(roleCanAccessModule("HEADTEACHER", "settings")).toBe(false);
    expect(roleCanAccessModule("TEACHER", "settings")).toBe(false);
    expect(roleCanAccessModule("BURSAR", "settings")).toBe(false);
    expect(roleCanAccessModule("ADMISSIONS_OFFICER", "settings")).toBe(false);
  });

  it("only BURSAR and PROPRIETOR (and SUPER_ADMIN) can access fees, finance and payroll", () => {
    for (const mod of ["fees", "finance", "payroll"] as const) {
      expect(roleCanAccessModule("BURSAR", mod)).toBe(true);
      expect(roleCanAccessModule("PROPRIETOR", mod)).toBe(true);
      expect(roleCanAccessModule("TEACHER", mod)).toBe(false);
      expect(roleCanAccessModule("HEADTEACHER", mod)).toBe(false);
      expect(roleCanAccessModule("ADMISSIONS_OFFICER", mod)).toBe(false);
    }
  });

  it("ADMISSIONS_OFFICER can access admissions and read students, but not staff or write students", () => {
    expect(roleCanAccessModule("ADMISSIONS_OFFICER", "admissions", "write")).toBe(true);
    expect(roleCanAccessModule("ADMISSIONS_OFFICER", "students", "read")).toBe(true);
    expect(roleCanAccessModule("ADMISSIONS_OFFICER", "students", "write")).toBe(false);
    expect(roleCanAccessModule("ADMISSIONS_OFFICER", "staff")).toBe(false);
  });

  it("anyRoleCanAccessModule is true if at least one role qualifies", () => {
    expect(anyRoleCanAccessModule(["TEACHER", "BURSAR"], "fees")).toBe(true);
    expect(anyRoleCanAccessModule(["TEACHER"], "fees")).toBe(false);
    expect(anyRoleCanAccessModule([], "dashboard")).toBe(false);
  });

  it("visibleModulesFor returns dashboard for every staff role", () => {
    for (const role of ROLE_NAMES) {
      if (role === "PARENT") continue;
      expect(visibleModulesFor([role])).toContain("dashboard");
    }
  });

  it("visibleModulesFor for TEACHER excludes finance-only modules", () => {
    const modules = visibleModulesFor(["TEACHER"]);
    expect(modules).toContain("students");
    expect(modules).toContain("academics");
    expect(modules).not.toContain("fees");
    expect(modules).not.toContain("payroll");
    expect(modules).not.toContain("settings");
  });

  it("every module has a human label", () => {
    for (const mod of MODULES) {
      expect(MODULE_LABELS[mod]).toBeTruthy();
    }
  });

  it("every role has a human label", () => {
    for (const role of ROLE_NAMES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
