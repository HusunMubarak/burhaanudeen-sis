import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * SchoolSettings is a singleton table. This helper guarantees a row
 * always exists so pages can read settings without null-checking
 * everywhere, and callers only ever pass the fields they want to change.
 */
export async function getSchoolSettings() {
  const existing = await prisma.schoolSettings.findFirst();
  if (existing) return existing;

  return prisma.schoolSettings.create({ data: {} });
}

export type SchoolSettingsUpdateInput = Partial<{
  name: string;
  motto: string;
  logoUrl: string | null;
  description: string;
  vision: string;
  mission: string;
  history: string;
  coreValues: string;
  address: string;
  town: string;
  district: string;
  region: string;
  country: string;
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  mapEmbedUrl: string;
  admissionFormFee: number;
  momoNumber: string;
  momoNetwork: string;
  momoAccountName: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
}>;

export async function updateSchoolSettings(input: SchoolSettingsUpdateInput, updatedBy?: string) {
  const current = await getSchoolSettings();
  return prisma.schoolSettings.update({
    where: { id: current.id },
    data: { ...input, updatedBy },
  });
}
