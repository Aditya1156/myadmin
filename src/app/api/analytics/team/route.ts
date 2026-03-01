import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/team - Team performance (ADMIN/MANAGER only)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Only ADMIN and MANAGER can view team performance
    if (!isAdminOrManager(user)) {
      throw new Error('Forbidden');
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const userId = searchParams.get('userId');

    // Date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Build filter clauses
    const businessDateFilter: Prisma.BusinessWhereInput = hasDateFilter
      ? { createdAt: dateFilter }
      : {};
    const activityDateFilter: Prisma.ActivityWhereInput = hasDateFilter
      ? { createdAt: dateFilter }
      : {};
    const dealDateFilter: Prisma.DealWhereInput = hasDateFilter
      ? { createdAt: dateFilter }
      : {};

    // If userId is provided, filter to that specific user
    const userWhere: Prisma.UserWhereInput = {
      isActive: true,
      ...(userId ? { id: userId } : {}),
    };

    // Fetch all active users with their related counts
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        role: true,
        businesses: {
          where: {
            isActive: true,
            ...businessDateFilter,
          },
          select: { id: true },
        },
        activities: {
          where: activityDateFilter,
          select: { id: true },
        },
        deals: {
          where: dealDateFilter,
          select: {
            id: true,
            amount: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = users.map((u) => ({
      userId: u.id,
      userName: u.name,
      role: u.role,
      businesses: u.businesses.length,
      activities: u.activities.length,
      deals: u.deals.length,
      revenue: u.deals.reduce((sum, d) => sum + d.amount, 0),
    }));

    // Sort by revenue descending for leaderboard-style output
    data.sort((a, b) => b.revenue - a.revenue);

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
