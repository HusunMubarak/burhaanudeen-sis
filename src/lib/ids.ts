import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatSequenceId } from "@/lib/id-format";

type Db = PrismaClient | Prisma.TransactionClient;

async function upsertSequence(db: Db, key: string): Promise<number> {
  const row = await db.idSequence.upsert({
    where: { id: key },
    update: { nextValue: { increment: 1 } },
    create: { id: key, nextValue: 2 }, // this call consumes value 1
    select: { nextValue: true },
  });
  // nextValue now holds the value to use *next* time, so subtract 1.
  return row.nextValue - 1;
}

/**
 * Generates gap-free, never-reused sequential numbers in the form
 * BIS-{year}-{00001}. Backed by the IdSequence table so concurrent
 * requests never hand out the same number.
 *
 * C7: pass `db` as an in-flight transaction client (`tx` from
 * `prisma.$transaction(async (tx) => ...)`) to generate the number as
 * part of a larger atomic operation — e.g. enrollment, where a failed
 * student insert must not burn an admission number. Omit `db` for a
 * standalone call (e.g. the public apply endpoint), which wraps
 * itself in its own transaction for atomicity against concurrent
 * requests.
 */
async function nextSequence(kind: "student" | "application" | "staff", year: number, db?: Db): Promise<number> {
  const key = `${kind}-${year}`;
  if (db) return upsertSequence(db, key);
  return prisma.$transaction((tx) => upsertSequence(tx, key));
}

export async function generateApplicationNumber(year: number = new Date().getFullYear(), db?: Db): Promise<string> {
  const seq = await nextSequence("application", year, db);
  return formatSequenceId("BIS", year, seq);
}

export async function generateStudentAdmissionNumber(year: number = new Date().getFullYear(), db?: Db): Promise<string> {
  const seq = await nextSequence("student", year, db);
  return formatSequenceId("BIS", year, seq);
}

export async function generateStaffNumber(year: number = new Date().getFullYear(), db?: Db): Promise<string> {
  const seq = await nextSequence("staff", year, db);
  return formatSequenceId("STF", year, seq);
}
