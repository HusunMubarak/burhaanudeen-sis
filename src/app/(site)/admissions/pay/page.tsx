import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentClaimForm } from "@/components/site/payment-claim-form";

export const metadata: Metadata = {
  title: "Submit Payment",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationNumber?: string }>;
}) {
  const params = await searchParams;

  return (
    <Section tone="paper">
      <Eyebrow>Admissions</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">Submit Payment</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        After paying the admission form fee by Mobile Money, submit the details below. An administrator will
        verify it before your application moves forward.
      </p>
      <Card className="mx-auto mt-10 max-w-2xl">
        <CardContent className="py-8">
          <PaymentClaimForm defaultApplicationNumber={params.applicationNumber ?? ""} />
        </CardContent>
      </Card>
    </Section>
  );
}
