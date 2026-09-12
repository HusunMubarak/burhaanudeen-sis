import type { Metadata } from "next";
import { Sparkles, BookOpenCheck, Library, CheckCircle2 } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Academics",
  description: "Academic programs at Burhaanudeen Islamic School — Creche, Primary and JHS curriculum overview.",
};

const PROGRAMS = [
  {
    icon: Sparkles,
    name: "Creche",
    ages: "Ages 2 – 4",
    summary: "Early childhood care built around play-based learning, language development and Islamic manners.",
    points: [
      "Language and pre-literacy foundations",
      "Motor skills and social development",
      "Introduction to basic Islamic etiquette",
      "Nap, feeding and hygiene routines supervised by trained caregivers",
    ],
  },
  {
    icon: BookOpenCheck,
    name: "Primary",
    ages: "Class 1 – Class 6",
    summary: "The national primary curriculum — English, Mathematics, Science and Social Studies — alongside Qur'anic and Islamic studies.",
    points: [
      "Literacy and numeracy built term by term",
      "Science, ICT and Social Studies foundations",
      "Qur'an recitation and memorization classes",
      "Continuous assessment to track progress",
    ],
  },
  {
    icon: Library,
    name: "JHS",
    ages: "JHS 1 – JHS 3",
    summary: "BECE-focused instruction across core and elective subjects, preparing learners for senior high school entry.",
    points: [
      "Full BECE subject coverage",
      "Exam preparation and mock assessments",
      "Continued Islamic and moral education",
      "Guidance on senior high school placement",
    ],
  },
];

export default function AcademicsPage() {
  return (
    <>
      <Section tone="paper" className="pb-10 text-center">
        <Eyebrow>Academics</Eyebrow>
        <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">
          A Path From Creche to JHS
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          Every stage builds deliberately on the one before it, combining the national curriculum with Qur&apos;anic
          and Islamic studies.
        </p>
      </Section>

      <Section tone="dim" className="grid gap-6 py-14 lg:grid-cols-3">
        {PROGRAMS.map((p) => (
          <Card key={p.name}>
            <CardContent className="py-8">
              <p.icon className="h-7 w-7 text-emerald-700" />
              <div className="mt-4 flex items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-semibold text-ink">{p.name}</h2>
                <span className="font-mono-label text-xs uppercase text-gold-600">{p.ages}</span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{p.summary}</p>
              <ul className="mt-5 space-y-2.5">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-sm text-ink">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </Section>

      <Section tone="paper">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow tone="gold">Islamic Education</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Faith at the Core</h2>
          <p className="mt-4 text-ink-soft">
            Qur&apos;an recitation, memorization (Hifz), Islamic studies and Arabic are taught at every level
            alongside the academic curriculum — not as an add-on, but as an equal pillar of the learner&apos;s
            education.
          </p>
        </div>
      </Section>
    </>
  );
}
