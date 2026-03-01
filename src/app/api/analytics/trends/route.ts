import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/analytics/trends - Daily activity trend
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');

    // Default: last 14 days
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 13); // 14 days including today
    defaultFrom.setHours(0, 0, 0, 0);

    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : defaultFrom;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now;

    // Determine user filter: SALES users can only see their own data
    let targetUserId: string | undefined;
    if (user.role === 'SALES') {
      targetUserId = user.id;
    } else if (userId) {
      targetUserId = userId;
    }

    const dateRange = { gte: from, lte: to };

    // ── Fetch activities in date range ─────────────────────────
    const activityWhere: Prisma.ActivityWhereInput = {
      createdAt: dateRange,
    };
    if (targetUserId) activityWhere.userId = targetUserId;

    const activities = await prisma.activity.findMany({
      where: activityWhere,
      select: {
        type: true,
        createdAt: true,
      },
    });

    // ── Fetch deals in date range ──────────────────────────────
    const dealWhere: Prisma.DealWhereInput = {
      createdAt: dateRange,
    };
    if (targetUserId) dealWhere.userId = targetUserId;

    const deals = await prisma.deal.findMany({
      where: dealWhere,
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // ── Build day-by-day map ───────────────────────────────────
    const dayMap = new Map<
      string,
      { calls: number; visits: number; deals: number; revenue: number }
    >();

    // Initialize all days in the range
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    while (cursor <= endDate) {
      const key = cursor.toISOString().split('T')[0];
      dayMap.set(key, { calls: 0, visits: 0, deals: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Tally activities
    for (const activity of activities) {
      const key = activity.createdAt.toISOString().split('T')[0];
      const day = dayMap.get(key);
      if (!day) continue;

      if (activity.type === 'CALL') {
        day.calls += 1;
      } else if (activity.type === 'VISIT') {
        day.visits += 1;
      }
    }

    // Tally deals
    for (const deal of deals) {
      const key = deal.createdAt.toISOString().split('T')[0];
      const day = dayMap.get(key);
      if (!day) continue;

      day.deals += 1;
      day.revenue += deal.amount;
    }

    // Convert to sorted array
    const data = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        calls: stats.calls,
        visits: stats.visits,
        deals: stats.deals,
        revenue: stats.revenue,
      }));

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
