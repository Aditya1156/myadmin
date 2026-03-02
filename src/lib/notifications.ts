import { prisma } from '@/lib/prisma';

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      },
    });
  } catch (error) {
    console.error('[Notification Error]', error);
  }
}

export async function notifyAdmins(params: {
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      })),
    });
  } catch (error) {
    console.error('[Notify Admins Error]', error);
  }
}
