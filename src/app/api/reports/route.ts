import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET /api/reports - Get comprehensive report data for PDF/Excel export
export async function GET() {
  try {
    const user = await requireAuth();
    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalBusinesses,
      totalDeals,
      totalRevenue,
      monthlyDeals,
      monthlyRevenue,
      statusBreakdown,
      categoryBreakdown,
      serviceBreakdown,
      teamPerformance,
      renewalStats,
      recentDeals,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.deal.count(),
      prisma.deal.aggregate({ _sum: { amount: true } }),
      prisma.deal.count({ where: { signedDate: { gte: startOfMonth } } }),
      prisma.deal.aggregate({
        where: { signedDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.business.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.business.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
      }),
      prisma.deal.groupBy({
        by: ['service'],
        _count: true,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          _count: {
            select: { businesses: true, activities: true, deals: true },
          },
        },
      }),
      prisma.deal.groupBy({
        by: ['renewalStatus'],
        _count: true,
      }),
      prisma.deal.findMany({
        take: 20,
        orderBy: { signedDate: 'desc' },
        select: {
          id: true,
          service: true,
          amount: true,
          paymentStatus: true,
          signedDate: true,
          business: { select: { businessName: true, ownerName: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    // Get revenue per user
    const revenueByUser = await prisma.deal.groupBy({
      by: ['userId'],
      _sum: { amount: true },
    });
    const revenueMap = new Map(revenueByUser.map((r) => [r.userId, r._sum.amount || 0]));

    return successResponse({
      summary: {
        totalBusinesses,
        totalDeals,
        totalRevenue: totalRevenue._sum.amount || 0,
        monthlyDeals,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
      },
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count,
      })),
      serviceBreakdown: serviceBreakdown.map((s) => ({
        service: s.service,
        count: s._count,
        revenue: s._sum.amount || 0,
      })),
      teamPerformance: teamPerformance.map((t) => ({
        name: t.name,
        role: t.role,
        businesses: t._count.businesses,
        activities: t._count.activities,
        deals: t._count.deals,
        revenue: revenueMap.get(t.id) || 0,
      })),
      renewalStats: renewalStats.map((r) => ({
        status: r.renewalStatus,
        count: r._count,
      })),
      recentDeals,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
