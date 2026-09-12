import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationForm } from "@/components/site/application-form";

export const metadata: Metadata = {
  title: "Apply for Admission",
  description: "Submit an admission application to Burhaanudeen Islamic School.",
};

export default function ApplyPage() {
  return (
    <Section tone="paper">
      <Eyebrow>Admissions</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">
        Apply for Admission
      </h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Fill in the form below to start your application. You&apos;ll receive an application number to pay the
        form fee against and to check your status later.
      </p>
      <Card className="mx-auto mt-10 max-w-3xl">
        <CardContent className="py-8">
          <ApplicationForm />
        </CardContent>
      </Card>
    </Section>
  );
}
