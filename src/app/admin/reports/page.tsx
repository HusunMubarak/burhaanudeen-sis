import Link from "next/link";
import { Receipt, AlertTriangle, History, TrendingUp, TrendingDown, Scale, Users, Wallet, BarChart3, GraduationCap, ClipboardList, CalendarCheck, IdCard } from "lucide-react";
import { requireModuleAccess } from "@/lib/authorize";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Reports" };

const REPORTS = [
  { href: "/admin/reports/students", icon: GraduationCap, title: "Student Reports", blurb: "All students, by class, by gender, new admissions, withdrawals, graduates." },
  { href: "/admin/reports/admissions", icon: ClipboardList, title: "Admissions Reports", blurb: "Applications, pending/verified payments, accepted, rejected, enrolled." },
  { href: "/admin/reports/fee-collection", icon: Receipt, title: "Fee Collection Report", blurb: "Expected fees by category, plus overall collection rate." },
  { href: "/admin/fees/owing", icon: AlertTriangle, title: "Outstanding Fee Report", blurb: "Every student with a balance — search, filter, export." },
  { href: "/admin/reports/payments", icon: History, title: "Payment History", blurb: "Every payment recorded across the school." },
  { href: "/admin/finance/revenue", icon: TrendingUp, title: "Revenue Report", blurb: "Non-fee income by category and date." },
  { href: "/admin/finance/expenses", icon: TrendingDown, title: "Expense Report", blurb: "All outgoings by category and date." },
  { href: "/admin/finance", icon: Scale, title: "Profit / Net Balance Report", blurb: "Revenue, expenses and the net operating balance, with monthly charts." },
  { href: "/admin/payroll", icon: Users, title: "Payroll Report", blurb: "Every payroll period, its status, and staff entries." },
  { href: "/admin/finance/expenses?categoryId=", icon: Wallet, title: "Salary Expense Report", blurb: "Staff salary expenses — filter the expense list by the \"Staff Salaries\" category." },
  { href: "/admin/reports/academic-performance", icon: BarChart3, title: "Academic Performance Report", blurb: "Average subject score by class for a chosen term." },
  { href: "/admin/reports/attendance", icon: CalendarCheck, title: "Attendance Reports", blurb: "Daily, monthly, term, per-student, or per-class attendance." },
  { href: "/admin/students/id-cards", icon: IdCard, title: "Student ID Cards", blurb: "Generate printable ID cards, several per page." },
];

export default async function ReportsPage() {
  await requireModuleAccess("reports", "read");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Students, admissions, finance, academics, and attendance — every report below supports PDF, Excel, CSV, and print.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.title} href={r.href}>
            <Card className="h-full transition-colors hover:bg-paper-dim">
              <CardContent className="py-6">
                <r.icon className="h-6 w-6 text-emerald-700" />
                <p className="mt-3 font-display text-base font-semibold text-ink">{r.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{r.blurb}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
