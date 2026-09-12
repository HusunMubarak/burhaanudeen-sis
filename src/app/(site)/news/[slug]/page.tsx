import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

async function getAnnouncement(slug: string) {
  return prisma.announcement.findFirst({ where: { slug, isPublished: true, isPrivate: false } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const announcement = await getAnnouncement(slug);
  if (!announcement) return { title: "Announcement Not Found" };
  return {
    title: announcement.title,
    description: announcement.body.slice(0, 155),
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const announcement = await getAnnouncement(slug);
  if (!announcement) notFound();

  return (
    <Section tone="paper">
      <Link href="/news" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to News
      </Link>
      <div className="mx-auto mt-6 max-w-3xl">
        <Eyebrow>Announcement</Eyebrow>
        <div className="mt-2 flex items-start gap-3">
          <Megaphone className="mt-1 h-6 w-6 shrink-0 text-gold-600" />
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{announcement.title}</h1>
        </div>
        {announcement.publishedAt && (
          <p className="mt-3 font-mono-label text-xs uppercase text-ink-soft">
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(announcement.publishedAt)}
          </p>
        )}
        <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink-soft">
          {announcement.body}
        </div>
      </div>
    </Section>
  );
}
