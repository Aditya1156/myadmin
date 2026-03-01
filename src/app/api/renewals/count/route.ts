import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/renewals/count - Get count of overdue renewals (for sidebar badge)
export async function GET() {
  try {
    const user = await requireAuth();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const where: Prisma.DealWhereInput = {
      renewalDate: { lt: monthStart },
      renewalStatus: { in: ['PENDING', 'CONTACTED'] },
    };

    if (user.role === 'SALES') {
      where.userId = user.id;
    }

    const count = await prisma.deal.count({ where });

    return successResponse({ count });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
