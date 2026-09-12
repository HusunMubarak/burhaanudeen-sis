import Link from "next/link";
import { Megaphone, CalendarDays, Images, Globe } from "lucide-react";
import { requireModuleAccess } from "@/lib/authorize";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Website" };

const SECTIONS = [
  { href: "/admin/website/announcements", icon: Megaphone, title: "Announcements", blurb: "Post news for the public site, parent portal, and dashboard." },
  { href: "/admin/website/events", icon: CalendarDays, title: "Events", blurb: "School events shown on the public events page." },
  { href: "/admin/website/gallery", icon: Images, title: "Gallery", blurb: "Photo gallery shown on the public site." },
  { href: "/admin/settings", icon: Globe, title: "Public Content", blurb: "About, vision, mission, contact details, and admission information." },
];

export default async function WebsitePage() {
  await requireModuleAccess("website");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Website</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Manage everything shown on the public website and in the parent/teacher portals — no code changes needed.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:bg-paper-dim">
              <CardContent className="py-6">
                <s.icon className="h-6 w-6 text-emerald-700" />
                <p className="mt-3 font-display text-base font-semibold text-ink">{s.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{s.blurb}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
