import Link from "next/link";
import {
  GraduationCap,
  CalendarRange,
  CalendarClock,
  BookMarked,
  Users2,
  ClipboardCheck,
  Percent,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Academics" };

export default async function AcademicsPage() {
  await requireModuleAccess("academics", "read");

  const [classCount, yearCount, termCount, subjectCount, assignmentCount, assessmentCount, currentYear] =
    await Promise.all([
      prisma.class.count(),
      prisma.academicYear.count(),
      prisma.term.count(),
      prisma.subject.count(),
      prisma.classSubject.count(),
      prisma.assessment.count(),
      prisma.academicYear.findFirst({ where: { isCurrent: true }, select: { name: true } }),
    ]);

  const sections = [
    { href: "/admin/academics/classes", icon: GraduationCap, title: "Classes", count: classCount, blurb: "Creche, Primary and JHS classes, capacity, and class teachers." },
    { href: "/admin/academics/years", icon: CalendarRange, title: "Academic Years", count: yearCount, blurb: "e.g. 2026/2027 — set the current year here." },
    { href: "/admin/academics/terms", icon: CalendarClock, title: "Terms", count: termCount, blurb: "Term 1, 2, 3 within each academic year." },
    { href: "/admin/academics/subjects", icon: BookMarked, title: "Subjects", count: subjectCount, blurb: "The subject catalogue — name, code and section." },
    { href: "/admin/academics/assignments", icon: Users2, title: "Class & Teacher Assignments", count: assignmentCount, blurb: "Which subjects are taught in which class, and by whom." },
    { href: "/admin/academics/assessments", icon: ClipboardCheck, title: "Exams & Results", count: assessmentCount, blurb: "Class tests, exams — and entering student scores." },
    { href: "/admin/academics/grading", icon: Percent, title: "Grading Scale", count: null, blurb: "Configure the score bands used to grade every result." },
    { href: "/admin/academics/promotions", icon: ArrowUpRight, title: "Student Promotion", count: null, blurb: "Prepare, review and confirm end-of-year promotion." },
    { href: "/admin/academics/report-cards", icon: FileText, title: "Report Cards", count: null, blurb: "Generate a student's report card PDF for a term." },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Academics</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {currentYear ? `Current academic year: ${currentYear.name}` : "No academic year set as current yet."}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:bg-paper-dim">
              <CardContent className="py-6">
                <s.icon className="h-6 w-6 text-emerald-700" />
                <p className="mt-3 font-display text-lg font-semibold text-ink">{s.title}</p>
                {s.count !== null && <p className="mt-1 text-2xl font-semibold text-ink">{s.count}</p>}
                <p className="mt-2 text-sm text-ink-soft">{s.blurb}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
