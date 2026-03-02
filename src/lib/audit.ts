import { prisma } from '@/lib/prisma';

export async function createAuditLog(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
      },
    });
  } catch (error) {
    console.error('[Audit Log Error]', error);
  }
}
