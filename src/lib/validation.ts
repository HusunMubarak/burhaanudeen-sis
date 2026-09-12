import { z } from "zod";
import { ROLE_NAMES } from "@/lib/rbac";

/** D3: a date of birth can never be in the future — used by both
 * applicationSchema and studentSchema so the same rule applies
 * whether a child arrives via the public apply form or direct entry. */
const dateOfBirthSchema = z
  .coerce.date({ message: "Enter a valid date of birth" })
  .refine((d) => d.getTime() <= Date.now(), { message: "Date of birth cannot be in the future" });

/** D3: an optional email field that, if provided, must be a valid
 * address — empty string is allowed (email is optional), but a
 * non-empty value that isn't a real email is rejected either way. */
const optionalEmailSchema = z
  .string()
  .trim()
  .max(150)
  .optional()
  .default("")
  .refine((v) => v === "" || z.string().email().safeParse(v).success, { message: "Enter a valid email address" });

/** A7: only http(s) URLs are ever stored for a field that later gets
 * rendered as `<a href>` or `<img src>` — javascript:, data:, file:
 * and similar schemes are rejected outright. This does not fetch or
 * otherwise validate the target exists — it only guards against the
 * value being used as an XSS vector when rendered. Applies to
 * document/screenshot/photo/logo URLs — real file uploads are
 * TODO(phase5).
 */
function isHttpsOrEmpty(v: string): boolean {
  if (v === "") return true;
  try {
    const parsed = new URL(v);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const HTTPS_URL_MESSAGE = { message: "Enter a valid http(s) link" };

/** For fields that default to "" (never null) when absent. */
const optionalHttpsUrlSchema = z.string().trim().max(1000).optional().default("").refine(isHttpsOrEmpty, HTTPS_URL_MESSAGE);

/** For fields backed by a nullable DB column (SchoolSettings.logoUrl, Staff.photoUrl, Student.photoUrl). */
const nullableHttpsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .refine((v) => v == null || isHttpsOrEmpty(v), HTTPS_URL_MESSAGE);

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().default(""),
  subject: z.string().trim().min(3, "Enter a subject").max(150),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(4000),
});

export const schoolSettingsSchema = z.object({
  name: z.string().trim().min(2).max(150),
  motto: z.string().trim().max(150),
  logoUrl: nullableHttpsUrlSchema,
  description: z.string().trim().max(2000),
  vision: z.string().trim().max(1000),
  mission: z.string().trim().max(1000),
  history: z.string().trim().max(5000),
  coreValues: z.string().trim().max(500),
  address: z.string().trim().max(300),
  town: z.string().trim().max(100),
  district: z.string().trim().max(100),
  region: z.string().trim().max(100),
  country: z.string().trim().max(100),
  phone: z.string().trim().max(40),
  altPhone: z.string().trim().max(40),
  email: z.string().trim().max(150).refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address",
  }),
  website: optionalHttpsUrlSchema,
  mapEmbedUrl: optionalHttpsUrlSchema,
  admissionFormFee: z.coerce.number().min(0).max(1_000_000),
  momoNumber: z.string().trim().max(30),
  momoNetwork: z.string().trim().max(30),
  momoAccountName: z.string().trim().max(150),
  facebookUrl: optionalHttpsUrlSchema,
  twitterUrl: optionalHttpsUrlSchema,
  instagramUrl: optionalHttpsUrlSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

// ---------------------------------------------------------------------------
// PHASE 2 — Admissions, Students, Staff, Classes
// ---------------------------------------------------------------------------

export const applicationSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the applicant's first name").max(100),
  lastName: z.string().trim().min(1, "Enter the applicant's last name").max(100),
  otherNames: z.string().trim().max(100).optional().default(""),
  gender: z.enum(["Male", "Female"], { message: "Select a gender" }),
  dateOfBirth: dateOfBirthSchema,
  nationality: z.string().trim().max(60).optional().default("Ghanaian"),
  address: z.string().trim().max(300).optional().default(""),

  guardianName: z.string().trim().min(1, "Enter a guardian name").max(150),
  guardianPhone: z.string().trim().min(6, "Enter a valid phone number").max(30),
  guardianEmail: optionalEmailSchema,
  emergencyContactName: z.string().trim().max(150).optional().default(""),
  emergencyContactPhone: z.string().trim().max(30).optional().default(""),
  previousSchool: z.string().trim().max(200).optional().default(""),

  levelAppliedFor: z.string().trim().min(1, "Select the level applying for").max(60),
  section: z.enum(["CRECHE", "PRIMARY", "JHS"], { message: "Select a section" }),
});

export const paymentClaimSchema = z.object({
  applicationNumber: z.string().trim().min(1, "Enter your application number"),
  guardianPhone: z.string().trim().min(6, "Enter the guardian phone number on the application"),
  payerName: z.string().trim().min(1, "Enter the payer's name").max(150),
  payerPhone: z.string().trim().min(6, "Enter the phone number used to pay").max(30),
  network: z.string().trim().max(30).optional().default(""),
  amount: z.coerce.number().positive("Enter the amount paid"),
  reference: z.string().trim().min(2, "Enter the transaction/reference number").max(100),
  paidAt: z.coerce.date({ message: "Enter the payment date" }),
  screenshotUrl: optionalHttpsUrlSchema,
});

export const admissionStatusCheckSchema = z.object({
  applicationNumber: z.string().trim().min(1, "Enter your application number"),
  guardianPhone: z.string().trim().min(6, "Enter the guardian phone number used on the application"),
});

export const paymentVerifySchema = z.object({
  action: z.enum(["VERIFY", "REJECT"]),
  note: z.string().trim().max(500).optional().default(""),
});

export const applicationReviewSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "INTERVIEW_REQUIRED", "ACCEPTED", "REJECTED", "WITHDRAWN"]),
  decisionReason: z.string().trim().max(1000).optional().default(""),
  adminNotes: z.string().trim().max(2000).optional().default(""),
});

export const enrollmentSchema = z.object({
  classId: z.string().trim().min(1, "Select a class"),
  academicYearId: z.string().trim().min(1, "Select an academic year"),
});

export const studentImportRowSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  otherNames: z.string().trim().max(100).optional().default(""),
  gender: z.enum(["Male", "Female"], { message: "Gender must be Male or Female" }),
  dateOfBirth: dateOfBirthSchema,
  guardianName: z.string().trim().min(1, "Guardian name is required").max(150),
  guardianPhone: z.string().trim().min(6, "Guardian phone is required").max(30),
  guardianEmail: optionalEmailSchema,
  className: z.string().trim().max(60).optional().default(""),
});

export const documentSchema = z.object({
  name: z.string().trim().min(1, "Enter a document name").max(150),
  url: optionalHttpsUrlSchema,
});

export const studentSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(100),
  lastName: z.string().trim().min(1, "Enter a last name").max(100),
  otherNames: z.string().trim().max(100).optional().default(""),
  photoUrl: nullableHttpsUrlSchema,
  gender: z.enum(["Male", "Female"], { message: "Select a gender" }),
  dateOfBirth: dateOfBirthSchema,
  nationality: z.string().trim().max(60).optional().default("Ghanaian"),
  address: z.string().trim().max(300).optional().default(""),

  guardianName: z.string().trim().min(1, "Enter a guardian name").max(150),
  guardianPhone: z.string().trim().min(6, "Enter a valid phone number").max(30),
  guardianEmail: optionalEmailSchema,
  emergencyContactName: z.string().trim().max(150).optional().default(""),
  emergencyContactPhone: z.string().trim().max(30).optional().default(""),
  previousSchool: z.string().trim().max(200).optional().default(""),

  classId: z.string().trim().max(60).optional().nullable(),
  academicYearId: z.string().trim().max(60).optional().nullable(),
  status: z
    .enum(["APPLICANT", "ACCEPTED", "ENROLLED", "ACTIVE", "SUSPENDED", "WITHDRAWN", "TRANSFERRED", "GRADUATED", "EXPELLED"])
    .optional(),
});

export const studentStatusChangeSchema = z.object({
  status: z.enum([
    "APPLICANT",
    "ACCEPTED",
    "ENROLLED",
    "ACTIVE",
    "SUSPENDED",
    "WITHDRAWN",
    "TRANSFERRED",
    "GRADUATED",
    "EXPELLED",
  ]),
  note: z.string().trim().max(500).optional().default(""),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's name").max(150),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one number")
    .optional(),
  category: z.enum(["TEACHING", "NON_TEACHING", "MANAGEMENT"]),
  position: z.string().trim().min(1, "Enter a position/title").max(100),
  photoUrl: nullableHttpsUrlSchema,
  gender: z.enum(["Male", "Female", ""]).optional(),
  phone: z.string().trim().max(30).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  dateJoined: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED", "TERMINATED", "RETIRED"]).optional(),
  salaryNote: z.string().trim().max(300).optional().default(""),
  roles: z.array(z.enum(ROLE_NAMES)).min(1, "Select at least one system role"),
});

export const classSchema = z.object({
  name: z.string().trim().min(1, "Enter a class name").max(60),
  section: z.enum(["CRECHE", "PRIMARY", "JHS"]),
  level: z.coerce.number().int().min(0).max(100).optional().default(0),
  capacity: z.coerce.number().int().min(1).max(200).optional().default(40),
  academicYearId: z.string().trim().min(1, "Select an academic year"),
  classTeacherId: z.string().trim().max(60).optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
});

export const academicYearSchema = z.object({
  name: z.string().trim().min(4, "Enter a year, e.g. 2026/2027").max(20),
  startDate: z.coerce.date({ message: "Enter a start date" }),
  endDate: z.coerce.date({ message: "Enter an end date" }),
  isCurrent: z.coerce.boolean().optional().default(false),
});

export const termSchema = z.object({
  name: z.string().trim().min(1, "Enter a term name").max(40),
  academicYearId: z.string().trim().min(1, "Select an academic year"),
  startDate: z.coerce.date({ message: "Enter a start date" }),
  endDate: z.coerce.date({ message: "Enter an end date" }),
  isCurrent: z.coerce.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// PHASE 3 — FINANCE
// ---------------------------------------------------------------------------

const positiveAmountSchema = z.coerce.number().positive("Enter an amount greater than zero").max(10_000_000);
const paymentMethodSchema = z.enum(["CASH", "MOMO", "BANK", "OTHER"], { message: "Select a payment method" });

export const feeCategorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(60),
  description: z.string().trim().max(300).optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const feeStructureSchema = z.object({
  academicYearId: z.string().trim().min(1, "Select an academic year"),
  termId: z.string().trim().min(1).optional().nullable(),
  classId: z.string().trim().min(1).optional().nullable(),
  categoryId: z.string().trim().min(1, "Select a fee category"),
  amount: positiveAmountSchema,
  isActive: z.coerce.boolean().optional().default(true),
});

/** Bulk-assigns matching fee structures to every student in a class
 * for a term — see the "assignable to that student" requirement. */
export const assignFeesSchema = z.object({
  classId: z.string().trim().min(1, "Select a class"),
  academicYearId: z.string().trim().min(1, "Select an academic year"),
  termId: z.string().trim().min(1).optional().nullable(),
});

export const paymentSchema = z.object({
  studentId: z.string().trim().min(1, "Select a student"),
  academicYearId: z.string().trim().min(1).optional().nullable(),
  termId: z.string().trim().min(1).optional().nullable(),
  amount: positiveAmountSchema,
  date: z.coerce.date({ message: "Enter a payment date" }),
  method: paymentMethodSchema,
  reference: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
});

export const paymentReversalSchema = z.object({
  reason: z.string().trim().min(3, "Explain why this payment is being reversed").max(500),
});

export const revenueCategorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(60),
  isActive: z.coerce.boolean().optional().default(true),
});

export const revenueTransactionSchema = z.object({
  categoryId: z.string().trim().min(1, "Select a category"),
  date: z.coerce.date({ message: "Enter a date" }),
  amount: positiveAmountSchema,
  description: z.string().trim().max(500).optional().default(""),
  method: paymentMethodSchema,
  reference: z.string().trim().max(100).optional().default(""),
});

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(60),
  isActive: z.coerce.boolean().optional().default(true),
});

export const expenseSchema = z.object({
  categoryId: z.string().trim().min(1, "Select a category"),
  date: z.coerce.date({ message: "Enter a date" }),
  amount: positiveAmountSchema,
  description: z.string().trim().max(500).optional().default(""),
  method: paymentMethodSchema,
  reference: z.string().trim().max(100).optional().default(""),
  receiptUrl: nullableHttpsUrlSchema,
});

export const salarySchema = z.object({
  staffId: z.string().trim().min(1, "Select a staff member"),
  salaryType: z.enum(["MONTHLY", "DAILY", "HOURLY"], { message: "Select a salary type" }),
  baseSalary: positiveAmountSchema,
  effectiveDate: z.coerce.date({ message: "Enter an effective date" }),
});

export const payrollPeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export const payrollEntryUpdateSchema = z.object({
  deductions: z.coerce.number().min(0).max(10_000_000),
});

export const financeReportQuerySchema = z.object({
  academicYearId: z.string().trim().optional(),
  termId: z.string().trim().optional(),
  classId: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ---------------------------------------------------------------------------
// PHASE 4 — ACADEMICS: SUBJECTS, ATTENDANCE, EXAMS, RESULTS, GRADING, PROMOTION
// ---------------------------------------------------------------------------

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Enter a subject name").max(100),
  code: z.string().trim().min(1, "Enter a subject code").max(20),
  level: z.enum(["CRECHE", "PRIMARY", "JHS"]).optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
});

export const classSubjectSchema = z.object({
  classId: z.string().trim().min(1, "Select a class"),
  subjectId: z.string().trim().min(1, "Select a subject"),
});

export const teacherSubjectSchema = z.object({
  staffId: z.string().trim().min(1, "Select a teacher"),
  classSubjectId: z.string().trim().min(1, "Select a class-subject"),
});

const attendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"], {
  message: "Select an attendance status",
});

/** One row within a bulk attendance submission for a class/date. */
export const attendanceRowSchema = z.object({
  studentId: z.string().trim().min(1),
  status: attendanceStatusSchema,
  note: z.string().trim().max(300).optional().default(""),
});

export const attendanceBulkSchema = z.object({
  classId: z.string().trim().min(1, "Select a class"),
  date: z.coerce.date({ message: "Enter a date" }).refine((d) => d.getTime() <= Date.now() + 86_400_000, {
    message: "Attendance date cannot be in the future",
  }),
  termId: z.string().trim().optional().nullable(),
  academicYearId: z.string().trim().optional().nullable(),
  entries: z.array(attendanceRowSchema).min(1, "Mark at least one student"),
});

const assessmentWeightSchema = z.coerce.number().min(0, "Weight cannot be negative").max(1000, "Weight is too large");
const assessmentScoreSchema = z.coerce.number().min(0, "Score cannot be negative").max(10_000, "Score is too large");

export const assessmentSchema = z.object({
  name: z.string().trim().min(1, "Enter an assessment name").max(150),
  type: z.string().trim().min(1, "Enter or select a type").max(60),
  classSubjectId: z.string().trim().min(1, "Select a class and subject"),
  termId: z.string().trim().min(1, "Select a term"),
  academicYearId: z.string().trim().min(1, "Select an academic year"),
  date: z.coerce.date({ message: "Enter a date" }),
  maxScore: assessmentScoreSchema.optional().default(100),
  weight: assessmentWeightSchema.optional().default(100),
});

/** One row within a bulk result-entry submission for an assessment. */
export const resultRowSchema = z.object({
  studentId: z.string().trim().min(1),
  score: assessmentScoreSchema,
  remark: z.string().trim().max(300).optional().default(""),
});

export const resultsBulkSchema = z.object({
  entries: z.array(resultRowSchema).min(1, "Enter at least one score"),
});

/** E4: configurable grading bands — administrators define these, not
 * a hard-coded set. minScore must be strictly below maxScore. */
export const gradeScaleSchema = z
  .object({
    minScore: z.coerce.number().min(0).max(10_000),
    maxScore: z.coerce.number().min(0).max(10_000),
    grade: z.string().trim().min(1, "Enter a grade label").max(20),
    remark: z.string().trim().max(150).optional().default(""),
    isActive: z.coerce.boolean().optional().default(true),
  })
  .refine((v) => v.minScore < v.maxScore, {
    message: "Minimum score must be less than maximum score",
    path: ["minScore"],
  });

export const promotionBatchCreateSchema = z.object({
  fromClassId: z.string().trim().min(1, "Select a class to promote from"),
  toAcademicYearId: z.string().trim().min(1, "Select the destination academic year"),
});

const promotionDecisionSchema = z.enum(["PROMOTE", "RETAIN", "GRADUATE", "TRANSFER", "WITHDRAW"], {
  message: "Select a decision",
});

/** E5: PROMOTE/RETAIN/TRANSFER need a destination class; GRADUATE and
 * WITHDRAW never do (there is nowhere for the student to go). */
export const promotionRecordUpdateSchema = z
  .object({
    decision: promotionDecisionSchema,
    toClassId: z.string().trim().max(60).optional().nullable(),
    note: z.string().trim().max(500).optional().default(""),
  })
  .refine((v) => (["PROMOTE", "RETAIN", "TRANSFER"].includes(v.decision) ? !!v.toClassId : true), {
    message: "Select a destination class for this decision",
    path: ["toClassId"],
  });

export const reportCardQuerySchema = z.object({
  studentId: z.string().trim().min(1, "Select a student"),
  termId: z.string().trim().min(1, "Select a term"),
  academicYearId: z.string().trim().min(1, "Select an academic year"),
});

// ---------------------------------------------------------------------------
// PHASE 5 — CONTENT, NOTIFICATIONS, PARENT PORTAL, ID CARDS
// ---------------------------------------------------------------------------

export const announcementSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  body: z.string().trim().min(2, "Content is required").max(10_000),
  category: z.string().trim().max(60).optional().default("General"),
  isPublished: z.coerce.boolean().optional().default(false),
  isPrivate: z.coerce.boolean().optional().default(false),
});

export const eventSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required").max(200),
    description: z.string().trim().max(5000).optional().default(""),
    location: z.string().trim().max(200).optional().default(""),
    startsAt: z.coerce.date({ message: "Enter a valid start date/time" }),
    endsAt: z.coerce.date({ message: "Enter a valid end date/time" }).optional().nullable(),
    isPublished: z.coerce.boolean().optional().default(false),
  })
  .refine((v) => !v.endsAt || v.endsAt.getTime() >= v.startsAt.getTime(), {
    message: "End time must be after the start time",
    path: ["endsAt"],
  });

export const galleryImageSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  imageUrl: z.string().trim().url("Enter a valid image URL"),
  caption: z.string().trim().max(500).optional().default(""),
  category: z.string().trim().max(60).optional().default("General"),
  isPublished: z.coerce.boolean().optional().default(true),
});

/** Links (or creates) a PARENT account and attaches it to a student. */
export const guardianLinkSchema = z.object({
  mode: z.enum(["existing", "new"]),
  email: z.string().trim().email("Enter a valid email address"),
  name: z.string().trim().max(150).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  relationship: z.string().trim().max(80).optional().default("Parent/Guardian"),
});

export const idCardRequestSchema = z.object({
  studentIds: z.array(z.string().trim().min(1)).min(1, "Select at least one student"),
});

export const notificationMarkReadSchema = z.object({
  ids: z.array(z.string().trim().min(1)).optional(),
  all: z.coerce.boolean().optional().default(false),
});
