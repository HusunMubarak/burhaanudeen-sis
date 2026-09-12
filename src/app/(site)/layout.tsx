import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getSchoolSettings } from "@/lib/data/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSchoolSettings();

  return (
    <>
      <SiteHeader schoolName={settings.name} motto={settings.motto} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        schoolName={settings.name}
        address={settings.address}
        phone={settings.phone}
        email={settings.email}
      />
    </>
  );
}
