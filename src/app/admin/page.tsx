import Link from "next/link";
import {
  GraduationCap,
  Users,
  Megaphone,
  MailQuestion,
  ClipboardList,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireModuleAccess } from "@/lib/authorize";
import { getStaffIdForUser, getTeacherAttendanceClassIds, isUnrestrictedAcademics } from "@/lib/academics/authorize";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFinanceSummary } from "@/lib/data/finance";
import { ROLE_LABELS, anyRoleCanAccessModule, type RoleName } from "@/lib/rbac";

export const metadata = { title: "Dashboard" };

const ghs = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export default async function AdminDashboardPage() {
  await requireModuleAccess("dashboard", "read");
  const session = await auth();
  const roles = (session?.user.roles ?? []) as RoleName[];
  const canSeeFinance = anyRoleCanAccessModule(roles, "finance") || anyRoleCanAccessModule(roles, "fees");
  const canSeeAdmissions = anyRoleCanAccessModule(roles, "admissions");
  const isTeacher = roles.includes("TEACHER") && !isUnrestrictedAcademics(roles);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    studentCount,
    staffCount,
    publishedAnnouncements,
    unreadMessages,
    pendingApplications,
    pendingPaymentVerifications,
    todayAttendance,
    recentPayments,
    recentApplications,
    financeSummary,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.staff.count({ where: { status: "ACTIVE" } }),
    prisma.announcement.count({ where: { isPublished: true } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED"] } } }),
    prisma.paymentClaim.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.attendance.groupBy({ by: ["status"], where: { date: todayStart }, _count: true }),
    canSeeFinance
      ? prisma.payment.findMany({
          where: { status: "COMPLETED" },
          orderBy: { date: "desc" },
          take: 5,
          include: { student: { select: { firstName: true, lastName: true } } },
        })
      : Promise.resolve([]),
    canSeeAdmissions
      ? prisma.application.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
      : Promise.resolve([]),
    canSeeFinance ? getFinanceSummary() : Promise.resolve(null),
  ]);

  let teacherClasses: { id: string; name: string }[] = [];
  if (isTeacher) {
    const staffId = await getStaffIdForUser(session!.user.id);
    if (staffId) {
      const classIds = await getTeacherAttendanceClassIds(staffId);
      teacherClasses = await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } });
    }
  }

  const attendanceToday = todayAttendance.reduce((sum, g) => sum + g._count, 0);

  const stats = [
    { icon: GraduationCap, label: "Active Students", value: studentCount },
    { icon: Users, label: "Active Staff", value: staffCount },
    ...(canSeeAdmissions ? [{ icon: ClipboardList, label: "Applications Awaiting Action", value: pendingApplications }] : []),
    { icon: Megaphone, label: "Published Announcements", value: publishedAnnouncements },
    { icon: CalendarCheck, label: "Attendance Marked Today", value: attendanceToday },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Welcome back, {session?.user.name?.split(" ")[0] ?? "there"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Signed in as {roles.map((r) => ROLE_LABELS[r]).join(", ")}.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-5">
              <s.icon className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 text-2xl font-semibold text-ink">{s.value}</p>
              <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isTeacher && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {teacherClasses.length === 0 ? (
              <p className="text-sm text-ink-soft">You are not yet assigned to a class or subject.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {teacherClasses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/attendance`}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-paper-dim"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/admin/attendance" className="text-emerald-700 hover:underline">
                Mark Attendance
              </Link>
              <Link href="/admin/academics/assessments" className="text-emerald-700 hover:underline">
                Enter Results
              </Link>
              <Link href="/admin/academics/report-cards" className="text-emerald-700 hover:underline">
                Report Cards
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {canSeeFinance && financeSummary && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Finance Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat icon={Receipt} label="Fees Expected" value={ghs.format(financeSummary.totalFeesExpected)} />
            <Stat icon={Receipt} label="Fees Collected" value={ghs.format(financeSummary.totalFeesCollected)} />
            <Stat icon={AlertTriangle} label="Outstanding" value={ghs.format(financeSummary.outstandingFees)} tone="warn" />
            <Stat icon={TrendingUp} label="Revenue" value={ghs.format(financeSummary.totalRevenue)} />
            <Stat icon={TrendingDown} label="Expenses" value={ghs.format(financeSummary.totalExpenses)} />
            <Stat icon={Wallet} label="Salaries Paid" value={ghs.format(financeSummary.salariesPaid)} />
            <Stat
              icon={Scale}
              label="Net Operating Balance"
              value={ghs.format(financeSummary.netOperatingBalance)}
              tone={financeSummary.netOperatingBalance >= 0 ? "good" : "warn"}
            />
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {canSeeFinance && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="text-sm text-ink-soft">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {recentPayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
                      <span className="text-ink">
                        {p.student.firstName} {p.student.lastName}
                      </span>
                      <span className="text-ink-soft">{ghs.format(Number(p.amount))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {canSeeAdmissions && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Admissions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <p className="text-sm text-ink-soft">No applications yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {recentApplications.map((a) => (
                    <li key={a.id} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
                      <span className="text-ink">
                        {a.firstName} {a.lastName}
                      </span>
                      <span className="text-ink-soft">{dateFmt.format(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {canSeeAdmissions && (
                <li className="flex items-center justify-between border-b border-line pb-2">
                  <Link href="/admin/admissions" className="text-ink hover:text-emerald-700">
                    Applications awaiting review
                  </Link>
                  <span className="font-semibold text-ink">{pendingApplications}</span>
                </li>
              )}
              {canSeeAdmissions && (
                <li className="flex items-center justify-between border-b border-line pb-2">
                  <Link href="/admin/admissions" className="text-ink hover:text-emerald-700">
                    Payments awaiting verification
                  </Link>
                  <span className="font-semibold text-ink">{pendingPaymentVerifications}</span>
                </li>
              )}
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <MailQuestion className="h-4 w-4" /> Unread contact messages
                </span>
                <span className="font-semibold text-ink">{unreadMessages}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-red-700" : "text-ink";
  return (
    <div>
      <Icon className="h-4 w-4 text-ink-soft" />
      <p className={`mt-2 text-lg font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}
