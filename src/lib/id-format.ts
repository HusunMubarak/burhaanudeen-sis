/**
 * Pure formatting logic for school-generated sequential IDs, kept
 * separate from lib/ids.ts (which is server-only and touches Prisma)
 * so it can be unit tested directly without a database.
 */
export function formatSequenceId(prefix: string, year: number, seq: number): string {
  if (seq < 1) throw new Error("Sequence number must be at least 1");
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}
