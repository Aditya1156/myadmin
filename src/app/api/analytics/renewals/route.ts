import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/renewals - Renewal analytics
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const userId = searchParams.get('userId');

    const dealWhere: Prisma.DealWhereInput = {};
    if (user.role === 'SALES') {
      dealWhere.userId = user.id;
    } else if (userId) {
      dealWhere.userId = userId;
    }

    if (from || to) {
      dealWhere.renewalDate = {};
      if (from) (dealWhere.renewalDate as Prisma.DateTimeNullableFilter).gte = new Date(from);
      if (to) (dealWhere.renewalDate as Prisma.DateTimeNullableFilter).lte = new Date(to);
    }

    // Deals that have a renewal date (excluding NOT_APPLICABLE)
    const renewalDealsWhere: Prisma.DealWhereInput = {
      ...dealWhere,
      renewalDate: { ...((dealWhere.renewalDate as object) || {}), not: null },
      renewalStatus: { not: 'NOT_APPLICABLE' },
    };

    const [renewed, churned, pending, contacted, revenueRetainedAgg, revenueLostAgg, serviceBreakdown] =
      await Promise.all([
        prisma.deal.count({ where: { ...renewalDealsWhere, renewalStatus: 'RENEWED' } }),
        prisma.deal.count({ where: { ...renewalDealsWhere, renewalStatus: 'CHURNED' } }),
        prisma.deal.count({ where: { ...renewalDealsWhere, renewalStatus: 'PENDING' } }),
        prisma.deal.count({ where: { ...renewalDealsWhere, renewalStatus: 'CONTACTED' } }),

        // Revenue retained: sum of child deal amounts where parent was renewed
        prisma.deal.aggregate({
          where: {
            ...dealWhere,
            parentDealId: { not: null },
          },
          _sum: { amount: true },
        }),

        // Revenue lost: sum of churned deal amounts
        prisma.deal.aggregate({
          where: { ...renewalDealsWhere, renewalStatus: 'CHURNED' },
          _sum: { amount: true },
        }),

        // Service-wise renewal breakdown
        prisma.deal.groupBy({
          by: ['service', 'renewalStatus'],
          where: {
            ...renewalDealsWhere,
            renewalStatus: { in: ['RENEWED', 'CHURNED', 'PENDING', 'CONTACTED'] },
          },
          _count: true,
        }),
      ]);

    const totalDueForRenewal = renewed + churned + pending + contacted;
    const decidedTotal = renewed + churned;
    const renewalRate = decidedTotal > 0 ? parseFloat(((renewed / decidedTotal) * 100).toFixed(2)) : 0;
    const churnRate = decidedTotal > 0 ? parseFloat(((churned / decidedTotal) * 100).toFixed(2)) : 0;

    // Transform service breakdown into a more usable format
    const serviceMap: Record<string, { total: number; renewed: number; churned: number }> = {};
    for (const row of serviceBreakdown) {
      if (!serviceMap[row.service]) {
        serviceMap[row.service] = { total: 0, renewed: 0, churned: 0 };
      }
      serviceMap[row.service].total += row._count;
      if (row.renewalStatus === 'RENEWED') serviceMap[row.service].renewed += row._count;
      if (row.renewalStatus === 'CHURNED') serviceMap[row.service].churned += row._count;
    }

    const serviceBreakdownFormatted = Object.entries(serviceMap).map(([service, data]) => ({
      service,
      total: data.total,
      renewed: data.renewed,
      churned: data.churned,
      renewalRate:
        data.renewed + data.churned > 0
          ? parseFloat(((data.renewed / (data.renewed + data.churned)) * 100).toFixed(2))
          : 0,
    }));

    return successResponse({
      totalDueForRenewal,
      renewed,
      churned,
      pending,
      contacted,
      renewalRate,
      churnRate,
      revenueRetained: revenueRetainedAgg._sum.amount ?? 0,
      revenueLost: revenueLostAgg._sum.amount ?? 0,
      serviceBreakdown: serviceBreakdownFormatted,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
