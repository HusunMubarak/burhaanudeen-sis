import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { StatusCheckerForm } from "@/components/site/status-checker-form";

export const metadata: Metadata = {
  title: "Check Admission Status",
  description: "Check the status of your Burhaanudeen Islamic School admission application.",
};

export default function AdmissionStatusPage() {
  return (
    <Section tone="paper">
      <Eyebrow>Admissions</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">Check Your Status</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Enter your application number and the guardian phone number used on the application.
      </p>
      <Card className="mx-auto mt-10 max-w-md">
        <CardContent className="py-8">
          <StatusCheckerForm />
        </CardContent>
      </Card>
    </Section>
  );
}
