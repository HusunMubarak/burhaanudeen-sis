import { NextResponse } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { listNotifications, unreadNotificationCount } from "@/lib/notifications";
import { notificationMarkReadSchema } from "@/lib/validation";

/** GET returns the signed-in user's own notifications — this is the
 * only guard that matters, unlike admin modules there is no role
 * check because every user (staff or parent) has their own inbox. */
export async function GET() {
  try {
    const session = await requireSession();
    const [items, unread] = await Promise.all([
      listNotifications(session.user.id),
      unreadNotificationCount(session.user.id),
    ]);
    return NextResponse.json({ items, unread });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** PATCH marks notifications read — either specific ids or, with
 * `all: true`, everything unread for this user. Always scoped to the
 * caller's own userId so nobody can mark (or even address) another
 * user's notifications. */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = notificationMarkReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the request and try again." }, { status: 422 });
    }

    if (parsed.data.all) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (parsed.data.ids?.length) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, id: { in: parsed.data.ids } },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
