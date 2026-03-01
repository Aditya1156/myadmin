import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { errorResponse, paginatedResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET /api/audit-logs - Get audit logs (ADMIN/MANAGER only)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const action = url.searchParams.get('action') ?? '';
    const entityType = url.searchParams.get('entityType') ?? '';
    const userId = url.searchParams.get('userId') ?? '';

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return paginatedResponse(logs, total, page, limit);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
