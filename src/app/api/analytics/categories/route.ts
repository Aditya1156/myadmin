import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/categories - Category performance breakdown
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

    // Build where clause
    const businessWhere: Prisma.BusinessWhereInput = { isActive: true };
    if (targetUserId) businessWhere.createdById = targetUserId;
    if (hasDateFilter) businessWhere.createdAt = dateFilter;

    // Group by category using Prisma groupBy
    const categoryGroups = await prisma.business.groupBy({
      by: ['category'],
      where: businessWhere,
      _count: { id: true },
    });

    // For each category, also count won deals
    const categoryData = await Promise.all(
      categoryGroups.map(async (group) => {
        const won = await prisma.business.count({
          where: {
            ...businessWhere,
            category: group.category,
            status: 'CLOSED_WON',
          },
        });

        const count = group._count.id;
        const conversionRate =
          count > 0 ? parseFloat(((won / count) * 100).toFixed(2)) : 0;

        return {
          category: group.category,
          count,
          won,
          conversionRate,
        };
      })
    );

    // Sort by count descending
    categoryData.sort((a, b) => b.count - a.count);

    return successResponse(categoryData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized')
      return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden')
      return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
