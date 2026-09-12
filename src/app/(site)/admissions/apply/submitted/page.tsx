import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Wallet } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getSchoolSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Application Submitted",
  robots: { index: false, follow: false },
};

export default async function ApplicationSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationNumber?: string }>;
}) {
  const [settings, params] = await Promise.all([getSchoolSettings(), searchParams]);
  const applicationNumber = params.applicationNumber ?? "";
  const feeDisplay = Number(settings.admissionFormFee) > 0 ? `GHS ${Number(settings.admissionFormFee).toFixed(2)}` : "the published amount";

  return (
    <Section tone="paper">
      <div className="mx-auto max-w-xl text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">Application Submitted</h1>
        <p className="mt-3 text-ink-soft">Keep your application number safe — you&apos;ll need it to pay and to check your status.</p>

        <Card className="mt-6">
          <CardContent className="py-6">
            <Eyebrow>Your Application Number</Eyebrow>
            <p className="mt-2 font-mono-label text-3xl font-semibold text-emerald-900">{applicationNumber || "—"}</p>
          </CardContent>
        </Card>

        <Card className="mt-4 text-left">
          <CardContent className="py-6">
            <Wallet className="h-5 w-5 text-gold-600" />
            <h2 className="mt-3 font-display text-lg font-semibold text-ink">Next: Pay the Form Fee</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Pay {feeDisplay} by Mobile Money, then submit your payment details so we can verify it:
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
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href={`/admissions/pay?applicationNumber=${encodeURIComponent(applicationNumber)}`} size="lg">
            Submit Payment Details
          </LinkButton>
          <LinkButton href="/admissions/status" variant="outline" size="lg">
            Check Status Later
          </LinkButton>
        </div>
        <Link href="/" className="mt-6 inline-block text-sm text-ink-soft hover:text-emerald-800">
          ← Back to home
        </Link>
      </div>
    </Section>
  );
}
