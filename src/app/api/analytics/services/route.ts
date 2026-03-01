import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma, ServiceType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/services - Service type breakdown
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

    // Build deal where clause
    const dealWhere: Prisma.DealWhereInput = {};
    if (targetUserId) dealWhere.userId = targetUserId;
    if (hasDateFilter) dealWhere.createdAt = dateFilter;

    // Group deals by service type
    const serviceGroups = await prisma.deal.groupBy({
      by: ['service'],
      where: dealWhere,
      _count: { id: true },
      _sum: { amount: true },
    });

    // Build response with all service types (include zero counts for completeness)
    const allServices: ServiceType[] = [
      'WEBSITE',
      'GBP',
      'ERP',
      'SOCIAL_MEDIA',
      'SEO',
      'LOGO_BRANDING',
    ];

    const serviceMap = new Map(
      serviceGroups.map((g) => [
        g.service,
        { count: g._count.id, revenue: g._sum.amount ?? 0 },
      ])
    );

    const data = allServices.map((service) => {
      const entry = serviceMap.get(service);
      return {
        service,
        count: entry?.count ?? 0,
        revenue: entry?.revenue ?? 0,
      };
    });

    // Sort by revenue descending
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
