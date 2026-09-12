import type { Metadata } from "next";
import { Compass, Target, HeartHandshake, BookOpen } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { StarDivider } from "@/components/ui/star-mark";
import { getSchoolSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "About Us",
  description: "Our history, vision, mission and core values at Burhaanudeen Islamic School, Sang, Mion District.",
};

export default async function AboutPage() {
  const settings = await getSchoolSettings();
  const values = settings.coreValues.split(",").map((v) => v.trim()).filter(Boolean);

  return (
    <>
      <Section tone="paper" className="pb-10 text-center">
        <Eyebrow>About the School</Eyebrow>
        <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">
          Our Story
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          {settings.description}
        </p>
      </Section>

      <Section tone="dim" className="py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="py-8">
              <BookOpen className="h-6 w-6 text-emerald-700" />
              <h2 className="mt-4 font-display text-xl font-semibold text-ink">History</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {settings.history ||
                  "Burhaanudeen Islamic School was founded to serve the children of Sang and the wider Mion District with an education that unites Islamic knowledge and modern academic learning. From its earliest classes, the school has grown steadily in enrollment and reputation, guided by a commitment to discipline, faith and excellence."}
              </p>
            </CardContent>
          </Card>
          <div className="grid gap-6">
            <Card>
              <CardContent className="py-6">
                <Compass className="h-5 w-5 text-emerald-700" />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink">Vision</h3>
                <p className="mt-2 text-sm text-ink-soft">{settings.vision}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6">
                <Target className="h-5 w-5 text-gold-600" />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink">Mission</h3>
                <p className="mt-2 text-sm text-ink-soft">{settings.mission}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <div className="text-center">
          <Eyebrow tone="gold">What Guides Us</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Core Values</h2>
          <div className="mt-4">
            <StarDivider />
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {values.map((v) => (
            <Card key={v} className="text-center">
              <CardContent className="py-8">
                <p className="font-display text-lg font-semibold text-emerald-900">{v}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="emerald">
        <div className="mx-auto max-w-3xl text-center">
          <HeartHandshake className="mx-auto h-8 w-8 text-gold-500" />
          <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">Our Educational Philosophy</h2>
          <p className="mt-4 text-paper/90">
            We believe a child grows best when knowledge of the world and knowledge of faith are taught together,
            not apart. Every subject is delivered with patience and structure, and every learner is treated as
            capable of both academic achievement and good character.
          </p>
        </div>
      </Section>
    </>
  );
}
