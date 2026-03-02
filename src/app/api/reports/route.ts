import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET /api/reports
export async function GET() {
  try {
    const user = await requireAuth();
    if (!isAdminOrManager(user)) return errorResponse('Forbidden', 403);

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
      teamPerformance,
      recentDeals,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.deal.count(),
      prisma.deal.aggregate({ _sum: { amount: true } }),
      prisma.deal.count({ where: { signedDate: { gte: startOfMonth } } }),
      prisma.deal.aggregate({ where: { signedDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.business.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.business.groupBy({ by: ['category'], _count: { _all: true } }),
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          _count: { select: { businesses: true, deals: true, activities: true } },
          deals: { select: { amount: true } },
        },
      }),
      prisma.deal.findMany({
        take: 20,
        orderBy: { signedDate: 'desc' },
        include: {
          business: { select: { businessName: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    return successResponse({
      summary: {
        totalBusinesses,
        totalDeals,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        monthlyDeals,
        monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
      },
      statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
      categoryBreakdown: categoryBreakdown.map((c) => ({ category: c.category, count: c._count._all })),
      teamPerformance: teamPerformance.map((u) => ({
        name: u.name,
        role: u.role,
        businesses: u._count.businesses,
        deals: u._count.deals,
        activities: u._count.activities,
        revenue: u.deals.reduce((sum, d) => sum + d.amount, 0),
      })),
      recentDeals: recentDeals.map((d) => ({
        id: d.id,
        service: d.service,
        amount: d.amount,
        paymentStatus: d.paymentStatus,
        signedDate: d.signedDate,
        business: d.business.businessName,
        user: d.user.name,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
