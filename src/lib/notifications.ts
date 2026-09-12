import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import type { RoleName } from "@/lib/rbac";

type NotifyInput = {
  title: string;
  body?: string;
  link?: string;
  type?: NotificationType;
};

/** Creates one notification for a single user. Never throws on failure
 * to notify — a missing notification should never break the action
 * that triggered it (e.g. verifying a payment must still succeed even
 * if the notification insert fails). */
export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title: input.title,
        body: input.body ?? "",
        link: input.link ?? "",
        type: input.type ?? "GENERAL",
      },
    });
  } catch {
    // best-effort — see doc comment above
  }
}

export async function notifyUsers(userIds: string[], input: NotifyInput): Promise<void> {
  await Promise.all(userIds.map((id) => notifyUser(id, input)));
}

/** Notifies every active user holding at least one of the given roles
 * — e.g. "New admission payment awaiting verification" goes to every
 * Proprietor/Headteacher/Admissions Officer, not just whoever is
 * online right now. */
export async function notifyRoles(roles: RoleName[], input: NotifyInput): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { name: { in: roles } } } } },
    select: { id: true },
  });
  await notifyUsers(users.map((u) => u.id), input);
}

/** Notifies every guardian linked to a student — e.g. "New report card
 * available" when results are published. */
export async function notifyGuardiansOfStudent(studentId: string, input: NotifyInput): Promise<void> {
  const guardians = await prisma.guardian.findMany({ where: { studentId }, select: { userId: true } });
  await notifyUsers(guardians.map((g) => g.userId), input);
}

export async function listNotifications(userId: string, unreadOnly = false, take = 30) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
