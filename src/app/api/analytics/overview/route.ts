import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/overview - Main KPI metrics
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const userId = searchParams.get('userId');

    // Date filter: applies to createdAt on businesses, activities, deals
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

    // ── Business where clause ──────────────────────────────────
    const businessWhere: Prisma.BusinessWhereInput = { isActive: true };
    if (targetUserId) businessWhere.createdById = targetUserId;
    if (hasDateFilter) businessWhere.createdAt = dateFilter;

    // ── Activity where clause ──────────────────────────────────
    const activityWhere: Prisma.ActivityWhereInput = {};
    if (targetUserId) activityWhere.userId = targetUserId;
    if (hasDateFilter) activityWhere.createdAt = dateFilter;

    // ── Deal where clause ──────────────────────────────────────
    const dealWhere: Prisma.DealWhereInput = {};
    if (targetUserId) dealWhere.userId = targetUserId;
    if (hasDateFilter) dealWhere.createdAt = dateFilter;

    // ── Run all queries in parallel ────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalBusinesses,
      totalVisits,
      totalCalls,
      totalDeals,
      revenueAgg,
      activeFollowUps,
      newThisMonth,
      wonThisMonth,
      renewalsDueThisMonth,
      renewalRevenueAgg,
    ] = await Promise.all([
      // Total businesses
      prisma.business.count({ where: businessWhere }),

      // Total visits (VISIT + OFFLINE activities)
      prisma.activity.count({
        where: {
          ...activityWhere,
          type: { in: ['VISIT'] },
        },
      }),

      // Total calls
      prisma.activity.count({
        where: {
          ...activityWhere,
          type: 'CALL',
        },
      }),

      // Total deals
      prisma.deal.count({ where: dealWhere }),

      // Total revenue & avg deal size
      prisma.deal.aggregate({
        where: dealWhere,
        _sum: { amount: true },
        _avg: { amount: true },
      }),

      // Active follow-ups (businesses with a followUpDate in the future or today)
      prisma.business.count({
        where: {
          ...businessWhere,
          status: 'FOLLOW_UP',
          followUpDate: { gte: new Date() },
        },
      }),

      // New businesses this month
      prisma.business.count({
        where: {
          ...businessWhere,
          createdAt: { gte: monthStart },
        },
      }),

      // Won deals this month
      prisma.deal.count({
        where: {
          ...dealWhere,
          createdAt: { gte: monthStart },
        },
      }),

      // Renewals due this month
      prisma.deal.count({
        where: {
          ...dealWhere,
          renewalDate: { gte: monthStart, lte: monthEnd },
          renewalStatus: { in: ['PENDING', 'CONTACTED'] },
        },
      }),

      // Renewal revenue this month (sum of amounts for deals renewed this month)
      prisma.deal.aggregate({
        where: {
          ...dealWhere,
          renewalStatus: 'RENEWED',
          updatedAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = revenueAgg._sum.amount ?? 0;
    const avgDealSize = revenueAgg._avg.amount ?? 0;

    // Conversion rate: deals / businesses (avoid division by zero)
    const conversionRate =
      totalBusinesses > 0
        ? parseFloat(((totalDeals / totalBusinesses) * 100).toFixed(2))
        : 0;

    return successResponse({
      totalBusinesses,
      totalVisits,
      totalCalls,
      totalDeals,
      totalRevenue,
      avgDealSize: parseFloat(avgDealSize.toFixed(2)),
      conversionRate,
      activeFollowUps,
      newThisMonth,
      wonThisMonth,
      renewalsDueThisMonth,
      renewalRevenue: renewalRevenueAgg._sum.amount ?? 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized')
      return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden')
      return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
