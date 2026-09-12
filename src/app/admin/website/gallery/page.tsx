import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { GalleryManager } from "@/components/admin/gallery-manager";

export const metadata = { title: "Gallery" };

export default async function GalleryPage() {
  await requireModuleAccess("website", "read");
  const items = await prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Gallery</h1>
      <p className="mt-1 text-sm text-ink-soft">Published images appear on the public website&apos;s gallery page.</p>
      <div className="mt-6">
        <GalleryManager initial={items} />
      </div>
    </div>
  );
}
