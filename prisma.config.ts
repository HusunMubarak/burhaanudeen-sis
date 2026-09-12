// Prisma ORM 7 moved connection config out of schema.prisma and into
// this file. The Prisma CLI (generate/migrate/db push/studio/seed)
// reads this file directly and does NOT auto-load .env — hence the
// explicit dotenv import below. This file is only used by the CLI;
// the running app reads DATABASE_URL via Next.js's own env loading
// in src/lib/prisma.ts.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
