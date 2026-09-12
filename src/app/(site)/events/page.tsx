import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";
import { Section, Eyebrow } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming events and school calendar for Burhaanudeen Islamic School.",
};

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    where: { isPublished: true },
    orderBy: { startsAt: "asc" },
  });

  const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Section tone="paper">
      <Eyebrow>Events</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">School Calendar</h1>

      <div className="mt-10">
        {events.length === 0 ? (
          <EmptyState
            title="No upcoming events"
            description="Term dates, ceremonies and school activities will be listed here as they are scheduled."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <Card key={e.id}>
                <CardContent className="py-6">
                  <CalendarDays className="h-5 w-5 text-emerald-700" />
                  <p className="mt-3 font-display text-lg font-semibold text-ink">{e.title}</p>
                  <p className="mt-1 font-mono-label text-xs uppercase text-gold-600">{dateFmt.format(e.startsAt)}</p>
                  {e.location && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
                      <MapPin className="h-3.5 w-3.5" /> {e.location}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-ink-soft line-clamp-3">{e.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
