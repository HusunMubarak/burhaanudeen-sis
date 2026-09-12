/**
 * Pure slug formatting, kept separate from any Prisma-touching code
 * (mirrors the split between lib/id-format.ts and lib/ids.ts) so it
 * can be unit tested without a database.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

/** Appends a short random suffix to keep a slug unique on collision. */
export function withUniqueSuffix(slug: string): string {
  return `${slug}-${Math.random().toString(36).slice(2, 7)}`;
}
