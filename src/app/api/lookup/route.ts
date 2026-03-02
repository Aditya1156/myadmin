import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET /api/lookup?familyId=KA-SHM-GPL-SAL-00001
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId')?.trim().toUpperCase();

    if (!familyId) {
      return errorResponse('Family ID is required', 400);
    }

    const business = await prisma.business.findFirst({
      where: {
        familyId: { equals: familyId, mode: 'insensitive' },
      },
      include: {
        city: { select: { id: true, name: true, state: true } },
        area: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        deals: {
          orderBy: { signedDate: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { deals: true, activities: true },
        },
      },
    });

    if (!business) {
      return errorResponse('No business found with this Family ID', 404);
    }

    // Compute summary
    const totalDeals = business.deals.length;
    const totalRevenue = business.deals.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = business.deals.reduce((sum, d) => sum + d.paidAmount, 0);
    const services = [...new Set(business.deals.map((d) => d.service))];
    const activeRenewals = business.deals.filter(
      (d) => d.renewalStatus === 'PENDING' && d.renewalDate
    ).length;

    return successResponse({
      business,
      summary: {
        totalDeals,
        totalRevenue,
        totalPaid,
        outstanding: totalRevenue - totalPaid,
        services,
        activeRenewals,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized')
      return errorResponse('Unauthorized', 401);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
