import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/renewals?type=due_this_month|overdue|upcoming - List deals due for renewal
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'due_this_month';

    if (!['due_this_month', 'overdue', 'upcoming', 'all'].includes(type)) {
      return errorResponse('Invalid type. Must be one of: due_this_month, overdue, upcoming, all', 400);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), 23, 59, 59, 999);

    const where: Prisma.DealWhereInput = {
      renewalDate: { not: null },
      renewalStatus: { in: ['PENDING', 'CONTACTED'] },
    };

    // SALES users can only see their own deals
    if (user.role === 'SALES') {
      where.userId = user.id;
    }

    switch (type) {
      case 'due_this_month':
        where.renewalDate = { gte: monthStart, lte: monthEnd };
        break;
      case 'overdue':
        where.renewalDate = { lt: monthStart };
        break;
      case 'upcoming':
        where.renewalDate = { gt: monthEnd, lte: threeMonthsFromNow };
        break;
      case 'all':
        // No additional date filter
        break;
    }

    const deals = await prisma.deal.findMany({
      where,
      select: {
        id: true,
        service: true,
        amount: true,
        signedDate: true,
        renewalDate: true,
        renewalStatus: true,
        renewalNotes: true,
        contractDurationMonths: true,
        paymentStatus: true,
        parentDealId: true,
        business: {
          select: {
            id: true,
            businessName: true,
            ownerName: true,
            phone: true,
            category: true,
            city: { select: { id: true, name: true } },
            area: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { renewalDate: 'asc' },
    });

    // Compute daysUntilRenewal
    const enriched = deals.map((deal) => ({
      ...deal,
      daysUntilRenewal: deal.renewalDate
        ? Math.ceil((new Date(deal.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return successResponse(enriched);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
