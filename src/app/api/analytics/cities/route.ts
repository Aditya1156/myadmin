import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/cities - City-wise performance breakdown
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

    // Build business where clause for sub-queries
    const businessWhere: Prisma.BusinessWhereInput = { isActive: true };
    if (targetUserId) businessWhere.createdById = targetUserId;
    if (hasDateFilter) businessWhere.createdAt = dateFilter;

    // Fetch cities with aggregated business data
    const cities = await prisma.city.findMany({
      where: {
        isActive: true,
        // SALES users only see their assigned cities
        ...(user.role === 'SALES' ? { assignedToId: user.id } : {}),
      },
      select: {
        id: true,
        name: true,
        businesses: {
          where: businessWhere,
          select: {
            id: true,
            status: true,
            deals: {
              select: {
                amount: true,
              },
              ...(hasDateFilter ? { where: { createdAt: dateFilter } } : {}),
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = cities.map((city) => {
      const businesses = city.businesses.length;
      const visited = city.businesses.filter(
        (b) => b.status !== 'NOT_VISITED'
      ).length;
      const interested = city.businesses.filter(
        (b) => b.status === 'INTERESTED' || b.status === 'NEGOTIATION'
      ).length;
      const won = city.businesses.filter(
        (b) => b.status === 'CLOSED_WON'
      ).length;
      const revenue = city.businesses.reduce(
        (sum, b) => sum + b.deals.reduce((ds, d) => ds + d.amount, 0),
        0
      );
      const conversionRate =
        businesses > 0
          ? parseFloat(((won / businesses) * 100).toFixed(2))
          : 0;

      return {
        cityId: city.id,
        cityName: city.name,
        businesses,
        visited,
        interested,
        won,
        revenue,
        conversionRate,
      };
    });

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
