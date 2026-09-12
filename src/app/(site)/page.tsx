import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpenCheck,
  Sparkles,
  Users,
  ShieldCheck,
  Library,
  UtensilsCrossed,
  Trophy,
  Music,
  Paintbrush,
  ArrowRight,
  Megaphone,
  Images,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { StarMark, StarDivider } from "@/components/ui/star-mark";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getSchoolSettings } from "@/lib/data/settings";
import { prisma } from "@/lib/prisma";
import { SchoolJsonLd } from "@/components/site/school-jsonld";

export const metadata: Metadata = {
  title: "Home",
  description:
    "A center of academic excellence and Islamic values in Sang, Mion District, Ghana — Creche, Primary and JHS admissions open now.",
};

const SECTIONS = [
  {
    icon: Sparkles,
    name: "Creche",
    blurb: "A warm, secure first classroom where toddlers build language, motor skills and early Islamic manners through play.",
  },
  {
    icon: BookOpenCheck,
    name: "Primary",
    blurb: "A strong foundation in literacy, numeracy, science and Qur'anic studies from Class 1 through Class 6.",
  },
  {
    icon: Library,
    name: "JHS",
    blurb: "BECE-focused academic rigor paired with continued Islamic studies, preparing learners for senior high school.",
  },
];

const WHY_CHOOSE = [
  { icon: ShieldCheck, title: "Safe, disciplined environment", text: "A structured daily routine and caring staff learners and parents can rely on." },
  { icon: BookOpenCheck, title: "Balanced curriculum", text: "National academic curriculum taught alongside Qur'anic and Islamic studies." },
  { icon: Users, title: "Small class attention", text: "Manageable class sizes so no learner is overlooked." },
  { icon: Trophy, title: "Character & excellence", text: "Discipline, honesty and diligence are taught as deliberately as any subject." },
];

const FACILITIES = [
  { icon: Library, name: "Classrooms & learning corners" },
  { icon: UtensilsCrossed, name: "Feeding & dining area" },
  { icon: BookOpenCheck, name: "Islamic studies hall" },
  { icon: ShieldCheck, name: "Secured compound" },
];

const ACTIVITIES = [
  { icon: Music, name: "Recitation & Nasheed" },
  { icon: Paintbrush, name: "Arts & handwriting" },
  { icon: Trophy, name: "Inter-class sports" },
  { icon: BookOpenCheck, name: "Qur'an memorization circles" },
];

export default async function HomePage() {
  const settings = await getSchoolSettings();

  const [announcements, galleryPreview] = await Promise.all([
    prisma.announcement.findMany({
      where: { isPublished: true, isPrivate: false },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.galleryImage.findMany({ where: { isPublished: true }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <>
      <SchoolJsonLd settings={settings} siteUrl={process.env.NEXTAUTH_URL ?? "http://localhost:3000"} />
      {/* HERO */}
      <section className="star-texture relative overflow-hidden border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <StarMark className="h-10 w-10" />
              <Eyebrow>Sang · Mion District · Northern Region, Ghana</Eyebrow>
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] text-emerald-900 sm:text-5xl lg:text-6xl">
              {settings.name}
            </h1>
            <p className="mt-3 font-display text-xl italic text-gold-600">{settings.motto}</p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              {settings.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/admissions" size="lg">
                Start Admission <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/about" variant="outline" size="lg">
                About Our School
              </LinkButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {SECTIONS.map((s) => (
              <Card key={s.name} className="bg-white/80">
                <CardContent className="flex flex-col gap-2 py-6">
                  <s.icon className="h-6 w-6 text-emerald-700" />
                  <p className="font-display text-lg font-semibold text-ink">{s.name}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="col-span-2 bg-emerald-900 text-paper">
              <CardContent className="flex items-center gap-3 py-6">
                <StarMark className="h-8 w-8 shrink-0" tone="gold" />
                <p className="text-sm text-paper/90">
                  Rooted in Islamic values, built for academic excellence — Creche through JHS under one roof.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <Section tone="paper">
        <Eyebrow>Why Families Choose Us</Eyebrow>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold text-ink sm:text-4xl">
          Academic excellence, raised on faith
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CHOOSE.map((w) => (
            <Card key={w.title}>
              <CardContent className="py-6">
                <w.icon className="h-6 w-6 text-emerald-700" />
                <p className="mt-4 font-display text-base font-semibold text-ink">{w.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{w.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* FACILITIES & ACTIVITIES */}
      <Section tone="dim">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>On Campus</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Facilities</h2>
            <ul className="mt-6 space-y-4">
              {FACILITIES.map((f) => (
                <li key={f.name} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-ink">{f.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow tone="gold">Beyond the Classroom</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Activities</h2>
            <ul className="mt-6 space-y-4">
              {ACTIVITIES.map((a) => (
                <li key={a.name} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-gold-600">
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-ink">{a.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ANNOUNCEMENTS */}
      <Section tone="paper">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Eyebrow>Stay Informed</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Latest Announcements</h2>
          </div>
          <LinkButton href="/news" variant="outline" size="sm" className="hidden sm:inline-flex">
            View all news
          </LinkButton>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {announcements.length === 0 && (
            <Card className="sm:col-span-3">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Megaphone className="h-6 w-6 text-emerald-700" />
                <p className="text-sm text-ink-soft">No announcements published yet. Check back soon.</p>
              </CardContent>
            </Card>
          )}
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-6">
                <Megaphone className="h-5 w-5 text-gold-600" />
                <p className="mt-3 font-display text-base font-semibold text-ink line-clamp-2">{a.title}</p>
                <p className="mt-2 text-sm text-ink-soft line-clamp-3">{a.body}</p>
                <Link href={`/news/${a.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  Read more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* GALLERY PREVIEW */}
      <Section tone="dim">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Eyebrow tone="gold">A Glimpse Inside</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Gallery</h2>
          </div>
          <LinkButton href="/gallery" variant="outline" size="sm" className="hidden sm:inline-flex">
            View full gallery
          </LinkButton>
        </div>
        {galleryPreview.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Images className="h-6 w-6 text-emerald-700" />
              <p className="text-sm text-ink-soft">Photos from school life will appear here soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {galleryPreview.map((g) => (
              <div key={g.id} className="aspect-square overflow-hidden rounded-lg border border-line bg-paper-dim">
                {/* Real deployments should point imageUrl at actual campus photography */}
                <div className="flex h-full w-full items-center justify-center text-ink-soft/50">
                  <Images className="h-6 w-6" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* CONTACT STRIP */}
      <Section tone="emerald">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <StarDivider tone="paper" />
            <h2 className="mt-4 text-center font-display text-2xl font-semibold sm:text-3xl lg:text-left">
              Ready to enroll your child?
            </h2>
            <div className="mt-6 flex flex-col gap-3 text-sm text-paper/90 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold-500" /> {settings.address}
              </span>
              {settings.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gold-500" /> {settings.phone}
                </span>
              )}
              {settings.email && (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gold-500" /> {settings.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-3 lg:justify-end">
            <LinkButton href="/admissions" variant="secondary" size="lg">
              Apply Now
            </LinkButton>
            <LinkButton href="/contact" variant="outline" size="lg" className="border-paper/40 text-paper hover:bg-white/10">
              Contact Us
            </LinkButton>
          </div>
        </div>
      </Section>
    </>
  );
}
