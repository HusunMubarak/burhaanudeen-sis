import { requireModuleAccess } from "@/lib/authorize";
import { getSchoolSettings } from "@/lib/data/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireModuleAccess("settings", "write");
  const settings = await getSchoolSettings();
  // Prisma's Decimal type isn't serializable across the server/client
  // boundary, so it's converted to a plain number before being handed
  // to the client form.
  const clientSettings = { ...settings, admissionFormFee: Number(settings.admissionFormFee) };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">School Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        These values populate the public website and admissions information automatically.
      </p>
      <div className="mt-6 max-w-3xl">
        <SettingsForm initial={clientSettings} />
      </div>
    </div>
  );
}
