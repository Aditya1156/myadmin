import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/cities/[id]/stats - Get city performance statistics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = params;

    // Verify city exists and user has access
    const cityWhere: Prisma.CityWhereInput = {
      id,
      isActive: true,
    };

    // SALES users can only see stats for cities assigned to them
    if (user.role === 'SALES') {
      cityWhere.assignedToId = user.id;
    }

    const city = await prisma.city.findFirst({
      where: cityWhere,
      select: { id: true, name: true },
    });

    if (!city) {
      return errorResponse('City not found', 404);
    }

    // Get all active businesses for this city
    const businesses = await prisma.business.findMany({
      where: {
        cityId: id,
        isActive: true,
      },
      select: {
        status: true,
        estimatedValue: true,
      },
    });

    const totalBusinesses = businesses.length;

    const visited = businesses.filter(
      (b) => b.status !== 'NOT_VISITED'
    ).length;

    const interested = businesses.filter(
      (b) => b.status === 'INTERESTED' || b.status === 'NEGOTIATION'
    ).length;

    const won = businesses.filter(
      (b) => b.status === 'CLOSED_WON'
    ).length;

    const lost = businesses.filter(
      (b) => b.status === 'CLOSED_LOST'
    ).length;

    // Calculate revenue from deals associated with this city's businesses
    const revenue = await prisma.deal.aggregate({
      where: {
        business: {
          cityId: id,
          isActive: true,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Conversion rate: won / (won + lost) * 100, or 0 if no closed deals
    const totalClosed = won + lost;
    const conversionRate = totalClosed > 0
      ? Number(((won / totalClosed) * 100).toFixed(2))
      : 0;

    const stats = {
      cityId: city.id,
      cityName: city.name,
      totalBusinesses,
      visited,
      interested,
      won,
      lost,
      revenue: revenue._sum.amount ?? 0,
      conversionRate,
    };

    return successResponse(stats);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('Already exists', 409);
      if (error.code === 'P2025') return errorResponse('Not found', 404);
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
