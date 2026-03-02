import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/businesses/bulk
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!isAdminOrManager(user)) return errorResponse('Forbidden', 403);

    const body = await request.json();
    const { action, ids, value } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('No businesses selected', 400);
    }

    let result;

    switch (action) {
      case 'update_status':
        result = await prisma.business.updateMany({
          where: { id: { in: ids } },
          data: { status: value },
        });
        break;

      case 'update_priority':
        result = await prisma.business.updateMany({
          where: { id: { in: ids } },
          data: { priority: value },
        });
        break;

      case 'delete':
        result = await prisma.business.deleteMany({
          where: { id: { in: ids } },
        });
        break;

      default:
        return errorResponse('Invalid action', 400);
    }

    await createAuditLog({
      userId: user.id,
      action: `bulk_${action}`,
      entityType: 'business',
      details: JSON.stringify({ ids, value, count: result.count }),
    });

    return successResponse({ count: result.count });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
