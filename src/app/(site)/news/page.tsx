import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, ArrowRight } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "News & Announcements",
  description: "Latest news and announcements from Burhaanudeen Islamic School.",
};

export default async function NewsPage() {
  const announcements = await prisma.announcement.findMany({
    where: { isPublished: true, isPrivate: false },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <Section tone="paper">
      <Eyebrow>News</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">Announcements</h1>

      <div className="mt-10">
        {announcements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description="School news and announcements will be posted here as they become available."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-6">
                  <Megaphone className="h-5 w-5 text-gold-600" />
                  <p className="mt-3 font-display text-lg font-semibold text-ink">{a.title}</p>
                  {a.publishedAt && (
                    <p className="mt-1 font-mono-label text-xs uppercase text-ink-soft">
                      {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(a.publishedAt)}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-ink-soft line-clamp-3">{a.body}</p>
                  <Link
                    href={`/news/${a.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700"
                  >
                    Read more <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
