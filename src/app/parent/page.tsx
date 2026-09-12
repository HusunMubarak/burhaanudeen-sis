import Link from "next/link";
import { requireSession } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { STUDENT_STATUS_LABELS } from "@/lib/students";

export const metadata = { title: "My Children" };

export default async function ParentHomePage() {
  const session = await requireSession();

  const [guardians, announcements] = await Promise.all([
    prisma.guardian.findMany({
      where: { userId: session.user.id },
      include: { student: { include: { class: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">My Children</h1>
        <p className="mt-1 text-sm text-ink-soft">Select a child to view their profile, attendance, results, and fees.</p>

        {guardians.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No children linked yet"
              description="Ask the school office to link your account to your child's student record."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {guardians.map((g) => (
              <Link key={g.id} href={`/parent/students/${g.studentId}`}>
                <Card className="h-full transition-colors hover:bg-paper-dim">
                  <CardContent className="py-6">
                    <p className="font-display text-lg font-semibold text-ink">
                      {g.student.firstName} {g.student.lastName}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {g.student.class?.name ?? "Unassigned class"} · {STUDENT_STATUS_LABELS[g.student.status]}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Announcements</h2>
        {announcements.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No announcements right now.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-white/70 p-4">
                <p className="font-medium text-ink">{a.title}</p>
                {a.publishedAt && (
                  <p className="text-xs text-ink-soft">
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(a.publishedAt)}
                  </p>
                )}
                <p className="mt-2 text-sm text-ink-soft line-clamp-3">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
