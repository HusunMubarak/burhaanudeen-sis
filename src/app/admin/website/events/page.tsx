import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { EventManager } from "@/components/admin/event-manager";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  await requireModuleAccess("website", "read");
  const items = await prisma.event.findMany({ orderBy: { startsAt: "desc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Events</h1>
      <p className="mt-1 text-sm text-ink-soft">Published events appear on the public website&apos;s events page.</p>
      <div className="mt-6">
        <EventManager
          initial={items.map((e) => ({
            ...e,
            startsAt: e.startsAt.toISOString(),
            endsAt: e.endsAt ? e.endsAt.toISOString() : null,
          }))}
        />
      </div>
    </div>
  );
}
