import type { Metadata } from "next";
import { ListChecks, FileText, Wallet, Search, Sparkles, BookOpenCheck, Library } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getSchoolSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Admissions",
  description: "How to apply to Burhaanudeen Islamic School — admission levels, requirements, process and fees.",
};

const LEVELS = [
  { icon: Sparkles, name: "Creche", detail: "Ages 2–4, rolling admission through the year." },
  { icon: BookOpenCheck, name: "Primary", detail: "Class 1 – Class 6, subject to available placement." },
  { icon: Library, name: "JHS", detail: "JHS 1 – JHS 3, subject to a brief placement check." },
];

const REQUIREMENTS = [
  "Completed admission form",
  "Child's birth certificate (original + copy)",
  "Two recent passport-sized photographs",
  "Immunization/health record (Creche & Primary)",
  "Previous school report, if transferring",
];

const PROCESS = [
  { step: "1", title: "Pick up or download the form", text: "Collect the admission form from the school office, or request it through the contact page." },
  { step: "2", title: "Pay the form fee", text: "Pay the admission form fee via Mobile Money using the details below, and keep your reference." },
  { step: "3", title: "Submit documents", text: "Return the completed form with the required documents to the school office." },
  { step: "4", title: "Await confirmation", text: "The admissions office will contact your provided phone number or email with the outcome." },
];

export default async function AdmissionsPage() {
  const settings = await getSchoolSettings();
  const feeDisplay = Number(settings.admissionFormFee) > 0 ? `GHS ${Number(settings.admissionFormFee).toFixed(2)}` : "To be announced";

  return (
    <>
      <Section tone="paper" className="pb-10 text-center">
        <Eyebrow>Admissions</Eyebrow>
        <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">
          Join Our School
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          Admissions are open for Creche, Primary and JHS. Apply online, pay the form fee, then track your
          status any time.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href="/admissions/apply" size="lg">
            Start Application
          </LinkButton>
          <LinkButton href="/admissions/status" variant="outline" size="lg">
            Check Status
          </LinkButton>
        </div>
      </Section>

      <Section tone="dim" className="py-14">
        <Eyebrow>Admission Levels</Eyebrow>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Where Your Child Can Start</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <Card key={l.name}>
              <CardContent className="py-6">
                <l.icon className="h-6 w-6 text-emerald-700" />
                <p className="mt-3 font-display text-lg font-semibold text-ink">{l.name}</p>
                <p className="mt-2 text-sm text-ink-soft">{l.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow tone="gold">Requirements</Eyebrow>
            <h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
              <ListChecks className="h-6 w-6 text-emerald-700" /> What to Bring
            </h2>
            <ul className="mt-6 space-y-3">
              {REQUIREMENTS.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-ink">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="h-fit">
            <CardContent className="py-6">
              <Wallet className="h-6 w-6 text-gold-600" />
              <h2 className="mt-3 font-display text-xl font-semibold text-ink">Form Fee & Payment</h2>
              <p className="mt-3 text-sm text-ink-soft">
                The admission form fee is <span className="font-semibold text-ink">{feeDisplay}</span>, payable by
                Mobile Money:
              </p>
              <dl className="mt-4 space-y-2 rounded-lg bg-paper-dim p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Network</dt>
                  <dd className="font-medium text-ink">{settings.momoNetwork || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Number</dt>
                  <dd className="font-medium text-ink">{settings.momoNumber || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Account Name</dt>
                  <dd className="font-medium text-ink">{settings.momoAccountName || "—"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-soft">
                Please keep your Mobile Money reference — you may be asked for it when submitting your form.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section tone="dim">
        <Eyebrow>Process</Eyebrow>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">How to Apply</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((p) => (
            <Card key={p.step}>
              <CardContent className="py-6">
                <span className="font-mono-label text-2xl font-semibold text-gold-600">{p.step}</span>
                <p className="mt-3 font-display text-base font-semibold text-ink">{p.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{p.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="emerald">
        <div className="mx-auto max-w-2xl text-center">
          <Search className="mx-auto h-7 w-7 text-gold-500" />
          <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">Checking Your Admission Status</h2>
          <p className="mt-3 text-paper/90">
            Use the application number you received when you applied, together with your guardian phone number,
            to check progress at any time.
          </p>
          <div className="mt-5">
            <LinkButton href="/admissions/status" variant="secondary" size="lg">
              Check Status
            </LinkButton>
          </div>
        </div>
      </Section>
    </>
  );
}
