import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/failures - Failure reason analysis
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const userId = searchParams.get('userId');

    // Date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Determine user filter: SALES users can only see their own data
    let targetUserId: string | undefined;
    if (user.role === 'SALES') {
      targetUserId = user.id;
    } else if (userId) {
      targetUserId = userId;
    }

    // Build where clause: only businesses that are CLOSED_LOST with a failure reason
    const businessWhere: Prisma.BusinessWhereInput = {
      isActive: true,
      status: 'CLOSED_LOST',
      failureReason: { not: null },
    };
    if (targetUserId) businessWhere.createdById = targetUserId;
    if (hasDateFilter) businessWhere.createdAt = dateFilter;

    // Group by failureReason
    const failureGroups = await prisma.business.groupBy({
      by: ['failureReason'],
      where: businessWhere,
      _count: { id: true },
    });

    // Calculate total for percentage
    const totalFailures = failureGroups.reduce(
      (sum, g) => sum + g._count.id,
      0
    );

    const data = failureGroups
      .map((group) => ({
        reason: group.failureReason!,
        count: group._count.id,
        percentage:
          totalFailures > 0
            ? parseFloat(((group._count.id / totalFailures) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return successResponse(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized')
      return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden')
      return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
