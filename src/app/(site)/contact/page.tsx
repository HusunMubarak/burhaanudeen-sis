import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/site/contact-form";
import { getSchoolSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Burhaanudeen Islamic School in Sang, Mion District, Ghana.",
};

export default async function ContactPage() {
  const settings = await getSchoolSettings();

  return (
    <Section tone="paper">
      <Eyebrow>Contact</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">Get in Touch</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Have a question about admissions, academics or anything else? Reach us using the details below, or send a
        message directly.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-start gap-3 py-5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-sm font-medium text-ink">Location</p>
                <p className="text-sm text-ink-soft">{settings.address}</p>
              </div>
            </CardContent>
          </Card>
          {settings.phone && (
            <Card>
              <CardContent className="flex items-start gap-3 py-5">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-medium text-ink">Phone</p>
                  <p className="text-sm text-ink-soft">{settings.phone}</p>
                  {settings.altPhone && <p className="text-sm text-ink-soft">{settings.altPhone}</p>}
                </div>
              </CardContent>
            </Card>
          )}
          {settings.email && (
            <Card>
              <CardContent className="flex items-start gap-3 py-5">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-medium text-ink">Email</p>
                  <p className="text-sm text-ink-soft">{settings.email}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="flex items-start gap-3 py-5">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-sm font-medium text-ink">Office Hours</p>
                <p className="text-sm text-ink-soft">Monday – Friday, 7:30am – 4:00pm</p>
              </div>
            </CardContent>
          </Card>

          {/* Map: integration-ready. Set mapEmbedUrl in School Settings to enable. */}
          <div className="overflow-hidden rounded-xl border border-line">
            {settings.mapEmbedUrl ? (
              <iframe
                src={settings.mapEmbedUrl}
                title="School location map"
                className="h-56 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-56 w-full flex-col items-center justify-center gap-2 bg-paper-dim text-ink-soft">
                <MapPin className="h-6 w-6" />
                <p className="text-xs">Map will appear here once a location is configured in Settings.</p>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="py-8">
            <h2 className="font-display text-xl font-semibold text-ink">Send a Message</h2>
            <div className="mt-6">
              <ContactForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
