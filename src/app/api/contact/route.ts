import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactMessageSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, rateLimitResponse, honeypotFilled } from "@/lib/public-guard";

export async function POST(req: Request) {
  // A5: 10 messages / 15 min / IP.
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(ip, "contact", 10);
  if (!allowed) return rateLimitResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (honeypotFilled(body)) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
  }

  await prisma.contactMessage.create({ data: parsed.data });

  return NextResponse.json({ ok: true }, { status: 201 });
}
