import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BulkActionSchema = z.object({
  action: z.enum(['update_status', 'update_priority', 'delete', 'assign_user']),
  businessIds: z.array(z.string()).min(1, 'Select at least one business'),
  value: z.string().optional(),
});

// POST /api/businesses/bulk - Perform bulk actions on businesses
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = BulkActionSchema.parse(body);

    // Only ADMIN/MANAGER can do bulk actions
    if (data.action === 'delete' && !isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    let affected = 0;

    switch (data.action) {
      case 'update_status': {
        if (!data.value) return errorResponse('Status value required', 400);
        const result = await prisma.business.updateMany({
          where: { id: { in: data.businessIds } },
          data: { status: data.value as never },
        });
        affected = result.count;
        break;
      }
      case 'update_priority': {
        if (!data.value) return errorResponse('Priority value required', 400);
        const result = await prisma.business.updateMany({
          where: { id: { in: data.businessIds } },
          data: { priority: data.value as never },
        });
        affected = result.count;
        break;
      }
      case 'delete': {
        const result = await prisma.business.deleteMany({
          where: { id: { in: data.businessIds } },
        });
        affected = result.count;
        break;
      }
      case 'assign_user': {
        if (!data.value) return errorResponse('User ID required', 400);
        const result = await prisma.business.updateMany({
          where: { id: { in: data.businessIds } },
          data: { createdById: data.value },
        });
        affected = result.count;
        break;
      }
    }

    await createAuditLog({
      userId: user.id,
      action: `bulk_${data.action}`,
      entityType: 'Business',
      details: {
        businessIds: data.businessIds,
        value: data.value,
        affected,
      },
    });

    return successResponse({ affected }, `${affected} businesses updated`);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message, 400);
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
