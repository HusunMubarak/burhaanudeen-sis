import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { ROLE_NAMES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "../src/lib/rbac";

// A9: this seed creates well-known development credentials — it must
// never run against a real deployment.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run the seed script with NODE_ENV=production.");
  process.exit(1);
}

const adapter = new PrismaPg(
  process.env.DATABASE_URL ?? "postgresql://burhaanudeen:burhaanudeen@localhost:5432/burhaanudeen_sis"
);
const prisma = new PrismaClient({ adapter });

// Development-only default credentials. CHANGE THESE before any real
// deployment — see README "Default/development admin accounts".
const DEV_PASSWORD = "ChangeMe123!";

const DEV_USERS: { email: string; name: string; role: (typeof ROLE_NAMES)[number] }[] = [
  { email: "superadmin@burhaanudeen.test", name: "System Administrator", role: "SUPER_ADMIN" },
  { email: "proprietor@burhaanudeen.test", name: "Alhaji Proprietor", role: "PROPRIETOR" },
  { email: "headteacher@burhaanudeen.test", name: "Madam Headteacher", role: "HEADTEACHER" },
  { email: "admissions@burhaanudeen.test", name: "Admissions Officer", role: "ADMISSIONS_OFFICER" },
  { email: "bursar@burhaanudeen.test", name: "School Bursar", role: "BURSAR" },
  { email: "teacher@burhaanudeen.test", name: "Sample Teacher", role: "TEACHER" },
];

async function main() {
  console.log("Seeding roles...");
  for (const roleName of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: { label: ROLE_LABELS[roleName], description: ROLE_DESCRIPTIONS[roleName] },
      create: { name: roleName, label: ROLE_LABELS[roleName], description: ROLE_DESCRIPTIONS[roleName] },
    });
  }

  console.log("Seeding school settings...");
  const existingSettings = await prisma.schoolSettings.findFirst();
  if (!existingSettings) {
    await prisma.schoolSettings.create({
      data: {
        phone: "+233 24 000 0000",
        email: "info@burhaanudeenschool.edu.gh",
        momoNetwork: "MTN Mobile Money",
        momoNumber: "024 000 0000",
        momoAccountName: "Burhaanudeen Islamic School",
        admissionFormFee: 50,
      },
    });
  }

  console.log("Seeding development users...");
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  for (const u of DEV_USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash },
      create: { email: u.email, name: u.name, passwordHash },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  console.log("Seeding sample academic structure...");
  const year = await prisma.academicYear.upsert({
    where: { name: "2025/2026" },
    update: {},
    create: {
      name: "2025/2026",
      startDate: new Date("2025-09-08"),
      endDate: new Date("2026-07-24"),
      isCurrent: true,
    },
  });

  await prisma.term.upsert({
    where: { academicYearId_name: { academicYearId: year.id, name: "Term 1" } },
    update: {},
    create: {
      academicYearId: year.id,
      name: "Term 1",
      startDate: new Date("2025-09-08"),
      endDate: new Date("2025-12-12"),
      isCurrent: true,
    },
  });

  const classNames: { name: string; section: "CRECHE" | "PRIMARY" | "JHS" }[] = [
    { name: "Creche 1", section: "CRECHE" },
    { name: "Primary 1", section: "PRIMARY" },
    { name: "JHS 1", section: "JHS" },
  ];
  for (const c of classNames) {
    await prisma.class.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: c.name } },
      update: {},
      create: { ...c, academicYearId: year.id },
    });
  }

  console.log("Seeding sample public content...");
  await prisma.announcement.upsert({
    where: { slug: "admissions-open-2025-2026" },
    update: {},
    create: {
      title: "Admissions Open for 2025/2026 Academic Year",
      slug: "admissions-open-2025-2026",
      body: "Burhaanudeen Islamic School is now accepting applications for Creche, Primary and JHS for the 2025/2026 academic year. Visit the Admissions page for requirements and the application process.",
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  console.log("Seeding starter finance categories...");
  const feeCategoryNames = ["Tuition", "Feeding", "Books", "Uniform", "Transport", "Examination", "Registration", "Other"];
  for (const name of feeCategoryNames) {
    await prisma.feeCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  const revenueCategoryNames = ["Student Fees", "Admission Forms", "Registration", "Feeding", "Uniform", "Books", "Transport", "Other"];
  for (const name of revenueCategoryNames) {
    await prisma.revenueCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  const expenseCategoryNames = [
    "Staff Salaries",
    "Utilities",
    "Rent",
    "Food",
    "Teaching Materials",
    "Maintenance",
    "Transport",
    "Equipment",
    "Internet",
    "Other",
  ];
  for (const name of expenseCategoryNames) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log("\nSeed complete.");
  console.log("Development login credentials (CHANGE before production):");
  for (const u of DEV_USERS) {
    console.log(`  ${ROLE_LABELS[u.role].padEnd(22)} ${u.email} / ${DEV_PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
