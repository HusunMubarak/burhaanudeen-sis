import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/site/section";
import { EmptyState } from "@/components/ui/states";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos of school life at Burhaanudeen Islamic School.",
};

export default async function GalleryPage() {
  const images = await prisma.galleryImage.findMany({ where: { isPublished: true }, orderBy: { createdAt: "desc" } });

  const categories = Array.from(new Set(images.map((i) => i.category)));

  return (
    <Section tone="paper">
      <Eyebrow>Gallery</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-900 sm:text-5xl">School Life</h1>

      <div className="mt-10">
        {images.length === 0 ? (
          <EmptyState
            title="Gallery coming soon"
            description="Photos from school activities, ceremonies and everyday classroom life will appear here."
          />
        ) : (
          categories.map((category) => (
            <div key={category} className="mb-10">
              <h2 className="font-display text-xl font-semibold text-ink">{category}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images
                  .filter((i) => i.category === category)
                  .map((img) => (
                    <figure
                      key={img.id}
                      className="aspect-square overflow-hidden rounded-lg border border-line bg-paper-dim"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL, not a local/optimizable asset */}
                      <img src={img.imageUrl} alt={img.title} className="h-full w-full object-cover" loading="lazy" />
                      {img.caption && (
                        <figcaption className="sr-only">{img.caption}</figcaption>
                      )}
                    </figure>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
