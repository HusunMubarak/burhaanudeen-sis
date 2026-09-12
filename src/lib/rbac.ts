/**
 * Role-Based Access Control — single source of truth.
 *
 * IMPORTANT: This module is imported by both proxy.ts (route guard) and
 * server code (API routes, server components). It intentionally has no
 * Prisma or other Node-only imports, keeping it a small, fast, pure
 * module usable anywhere in the request lifecycle.
 *
 * Frontend hiding of nav items is a UX nicety only. Every API route
 * and server action re-checks permissions server-side — see
 * `requireRole` / `requirePermission` in `src/lib/authorize.ts`.
 */

export const ROLE_NAMES = [
  "SUPER_ADMIN",
  "PROPRIETOR",
  "HEADTEACHER",
  "ADMISSIONS_OFFICER",
  "BURSAR",
  "TEACHER",
  "PARENT",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: "Super Administrator",
  PROPRIETOR: "Proprietor",
  HEADTEACHER: "Headteacher",
  ADMISSIONS_OFFICER: "Admissions Officer",
  BURSAR: "Bursar / Accountant",
  TEACHER: "Teacher",
  PARENT: "Parent",
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: "Full system access across every module.",
  PROPRIETOR: "Administrative oversight and financial visibility.",
  HEADTEACHER: "Academic, student and day-to-day administrative access.",
  ADMISSIONS_OFFICER: "Manages admissions applications and enquiries.",
  BURSAR: "Manages fees, payroll and financial records.",
  TEACHER: "Access to assigned classes, students and academics.",
  PARENT: "Future-ready portal access for guardians.",
};

/** Modules shown in the admin sidebar (also used to gate route access). */
export const MODULES = [
  "dashboard",
  "students",
  "staff",
  "admissions",
  "academics",
  "attendance",
  "fees",
  "finance",
  "payroll",
  "reports",
  "website",
  "settings",
  "audit-logs",
] as const;

export type ModuleName = (typeof MODULES)[number];

export type AccessLevel = "read" | "write";

/**
 * Which roles may access which modules, split by level. `write` roles
 * implicitly also get `read` — list a role in `read` only when it needs
 * view-only access beyond the writers (e.g. Bursar reading Admissions).
 * SUPER_ADMIN implicitly has full write access to everything and is
 * never listed below.
 *
 * Some roles are further scoped at the data-query level, not just the
 * module level — e.g. Teachers only ever see students in classes where
 * they are the assigned class teacher (see src/lib/data/students.ts).
 */
const MODULE_ACCESS: Record<ModuleName, { read: RoleName[]; write: RoleName[] }> = {
  dashboard: { read: ["PROPRIETOR", "HEADTEACHER", "ADMISSIONS_OFFICER", "BURSAR", "TEACHER"], write: [] },
  students: { read: ["ADMISSIONS_OFFICER", "TEACHER"], write: ["PROPRIETOR", "HEADTEACHER"] },
  staff: { read: [], write: ["PROPRIETOR", "HEADTEACHER"] },
  admissions: { read: ["BURSAR"], write: ["PROPRIETOR", "HEADTEACHER", "ADMISSIONS_OFFICER"] },
  academics: { read: ["TEACHER"], write: ["PROPRIETOR", "HEADTEACHER"] },
  attendance: { read: ["PROPRIETOR"], write: ["HEADTEACHER", "TEACHER"] },
  fees: { read: [], write: ["PROPRIETOR", "BURSAR"] },
  finance: { read: [], write: ["PROPRIETOR", "BURSAR"] },
  payroll: { read: [], write: ["PROPRIETOR", "BURSAR"] },
  reports: { read: ["PROPRIETOR", "HEADTEACHER", "BURSAR"], write: [] },
  website: { read: [], write: ["PROPRIETOR", "HEADTEACHER", "ADMISSIONS_OFFICER"] },
  settings: { read: [], write: ["PROPRIETOR"] },
  "audit-logs": { read: ["PROPRIETOR"], write: [] },
};

export function roleCanAccessModule(role: RoleName, mod: ModuleName, level: AccessLevel = "read"): boolean {
  if (role === "SUPER_ADMIN") return true;
  const perms = MODULE_ACCESS[mod];
  if (level === "write") return perms.write.includes(role);
  return perms.read.includes(role) || perms.write.includes(role);
}

export function anyRoleCanAccessModule(roles: RoleName[], mod: ModuleName, level: AccessLevel = "read"): boolean {
  return roles.some((r) => roleCanAccessModule(r, mod, level));
}

/** Modules visible in the sidebar for a given set of roles, in nav order. */
export function visibleModulesFor(roles: RoleName[]): ModuleName[] {
  return MODULES.filter((m) => anyRoleCanAccessModule(roles, m));
}

export const MODULE_LABELS: Record<ModuleName, string> = {
  dashboard: "Dashboard",
  students: "Students",
  staff: "Staff",
  admissions: "Admissions",
  academics: "Academics",
  attendance: "Attendance",
  fees: "Fees",
  finance: "Finance",
  payroll: "Payroll",
  reports: "Reports",
  website: "Website",
  settings: "Settings",
  "audit-logs": "Audit Logs",
};

export const MODULE_ICON_KEYS: Record<ModuleName, string> = {
  dashboard: "LayoutDashboard",
  students: "GraduationCap",
  staff: "Users",
  admissions: "ClipboardList",
  academics: "BookOpen",
  attendance: "CalendarCheck",
  fees: "Wallet",
  finance: "Landmark",
  payroll: "Banknote",
  reports: "BarChart3",
  website: "Globe",
  settings: "Settings",
  "audit-logs": "ScrollText",
};

/** Modules implemented with real functionality in this phase. */
export const IMPLEMENTED_MODULES: ModuleName[] = [
  "dashboard",
  "settings",
  "students",
  "staff",
  "admissions",
  "academics",
  "attendance",
  "audit-logs",
  "fees",
  "finance",
  "payroll",
  "reports",
];

/**
 * A1: server-side policy for which roles a staff account may be
 * granted. This is the actual security boundary — the staff form
 * hiding a checkbox in the UI is a convenience, not enforcement.
 *
 * Rules:
 *  - SUPER_ADMIN can only be granted by an existing SUPER_ADMIN.
 *  - An existing SUPER_ADMIN can grant any role.
 *  - Otherwise, a caller can only grant roles they themselves hold
 *    (a Headteacher cannot grant Proprietor; a Bursar cannot grant
 *    Headteacher, etc).
 */
export function canGrantRole(callerRoles: RoleName[], targetRole: RoleName): boolean {
  if (targetRole === "SUPER_ADMIN") return callerRoles.includes("SUPER_ADMIN");
  if (callerRoles.includes("SUPER_ADMIN")) return true;
  return callerRoles.includes(targetRole);
}

export function canGrantRoles(callerRoles: RoleName[], targetRoles: RoleName[]): boolean {
  return targetRoles.every((r) => canGrantRole(callerRoles, r));
}

/**
 * A8: student export (CSV/XLSX/PDF) is a full PII dump — narrower
 * than ordinary students:write access, and never available to
 * Teachers or the Admissions Officer even though they may have read
 * access to the students module. SUPER_ADMIN is implicitly included
 * everywhere, as usual — see requireRole in src/lib/authorize.ts.
 */
export const STUDENT_EXPORT_ROLES: RoleName[] = ["PROPRIETOR", "HEADTEACHER"];
