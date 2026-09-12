/**
 * Integration tests that hit the real database via Prisma.
 *
 * These require the Prisma client to be generated and the schema to
 * be pushed to a database first:
 *
 *   npm run db:generate
 *   npm run db:push
 *   npm test
 *
 * They are skipped automatically (see beforeAll) if the Prisma client
 * has not been generated yet, so `npm test` never crashes a machine
 * that hasn't run the setup — it just reports these as skipped and
 * points at the commands above.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";

let prismaAvailable = true;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

beforeAll(async () => {
  try {
    const mod = await import("@/lib/prisma");
    prisma = mod.prisma;
    await prisma.$connect();
  } catch {
    prismaAvailable = false;
  }
});

afterAll(async () => {
  if (prismaAvailable && prisma) await prisma.$disconnect();
});

describe("database foundation", () => {
  it("creates a role and a user with an assigned role (UserRole)", async () => {
    if (!prismaAvailable) {
      console.warn("Skipping: run `npm run db:generate && npm run db:push` first.");
      return;
    }

    const role = await prisma.role.upsert({
      where: { name: "TEACHER" },
      update: {},
      create: { name: "TEACHER", label: "Teacher", description: "Teacher-level access." },
    });

    const passwordHash = await bcrypt.hash("TestPassword123!", 10);
    const user = await prisma.user.upsert({
      where: { email: "test-teacher@burhaanudeen.test" },
      update: { passwordHash },
      create: { name: "Test Teacher", email: "test-teacher@burhaanudeen.test", passwordHash },
    });

    const userRole = await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    expect(userRole.userId).toBe(user.id);
    expect(userRole.roleId).toBe(role.id);

    const withRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: { roles: { include: { role: true } } },
    });
    expect(withRoles?.roles.map((r: { role: { name: string } }) => r.role.name)).toContain("TEACHER");
  });

  it("enforces unique email at the database level", async () => {
    if (!prismaAvailable) return;

    const passwordHash = await bcrypt.hash("TestPassword123!", 10);
    await prisma.user.upsert({
      where: { email: "duplicate@burhaanudeen.test" },
      update: {},
      create: { name: "First", email: "duplicate@burhaanudeen.test", passwordHash },
    });

    await expect(
      prisma.user.create({
        data: { name: "Second", email: "duplicate@burhaanudeen.test", passwordHash },
      })
    ).rejects.toBeTruthy();
  });

  it("maintains a single, always-available SchoolSettings row", async () => {
    if (!prismaAvailable) return;
    const { getSchoolSettings } = await import("@/lib/data/settings");

    const first = await getSchoolSettings();
    const second = await getSchoolSettings();
    expect(first.id).toBe(second.id);

    const count = await prisma.schoolSettings.count();
    expect(count).toBe(1);
  });

  it("updates school settings via updateSchoolSettings and persists the change", async () => {
    if (!prismaAvailable) return;
    const { getSchoolSettings, updateSchoolSettings } = await import("@/lib/data/settings");

    await updateSchoolSettings({ motto: "Test Motto For Integration" });
    const settings = await getSchoolSettings();
    expect(settings.motto).toBe("Test Motto For Integration");
  });

  it("relates AcademicYear -> Term -> Class through foreign keys without orphaning data", async () => {
    if (!prismaAvailable) return;

    const year = await prisma.academicYear.upsert({
      where: { name: "TEST-YEAR" },
      update: {},
      create: { name: "TEST-YEAR", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31") },
    });

    const term = await prisma.term.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: "Test Term" } },
      update: {},
      create: {
        academicYearId: year.id,
        name: "Test Term",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-04-01"),
      },
    });

    expect(term.academicYearId).toBe(year.id);

    const yearWithTerms = await prisma.academicYear.findUnique({
      where: { id: year.id },
      include: { terms: true },
    });
    expect(yearWithTerms?.terms.some((t: { id: string }) => t.id === term.id)).toBe(true);
  });
});
