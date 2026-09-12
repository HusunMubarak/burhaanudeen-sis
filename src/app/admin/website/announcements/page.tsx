import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { AnnouncementManager } from "@/components/admin/announcement-manager";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireModuleAccess("website", "read");
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Announcements</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Published announcements appear on the public website, the parent portal, and the admin dashboard. Mark one
        private to keep it off the public site.
      </p>
      <div className="mt-6">
        <AnnouncementManager
          initial={items.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
