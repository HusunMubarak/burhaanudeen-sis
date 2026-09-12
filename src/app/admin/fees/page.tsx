import Link from "next/link";
import { Tags, ListTree, UserPlus, AlertTriangle } from "lucide-react";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Fees" };

export default async function FeesHubPage() {
  await requireModuleAccess("fees", "read");

  const [categoryCount, structureCount, owingCount] = await Promise.all([
    prisma.feeCategory.count({ where: { isActive: true } }),
    prisma.feeStructure.count({ where: { isActive: true } }),
    prisma.student.count({ where: { status: { in: ["ACTIVE", "ENROLLED"] } } }),
  ]);

  const sections = [
    { href: "/admin/fees/categories", icon: Tags, title: "Fee Categories", count: categoryCount, blurb: "Tuition, Feeding, Books, Uniform, Transport and more — fully configurable." },
    { href: "/admin/fees/structures", icon: ListTree, title: "Fee Structures", count: structureCount, blurb: "Set the amount per academic year, term, class and category." },
    { href: "/admin/fees/assign", icon: UserPlus, title: "Assign Fees", count: null, blurb: "Bulk-assign matching fee structures to a whole class." },
    { href: "/admin/fees/owing", icon: AlertTriangle, title: "Students Owing", count: owingCount, blurb: "Search, filter and export the students with an outstanding balance." },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Fees</h1>
      <p className="mt-1 text-sm text-ink-soft">Configure fee structures and manage student fee ledgers.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
