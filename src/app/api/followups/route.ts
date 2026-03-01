import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/followups?type=today|overdue|upcoming|all - Get grouped follow-ups
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'all';

    if (!['today', 'overdue', 'upcoming', 'all'].includes(type)) {
      return errorResponse('Invalid type. Must be one of: today, overdue, upcoming, all', 400);
    }

    // Calculate date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build where clause
    const where: Prisma.BusinessWhereInput = {
      isActive: true,
      followUpDate: { not: null },
    };

    // SALES users can only see their own businesses
    if (user.role === 'SALES') {
      where.createdById = user.id;
    }

    switch (type) {
      case 'today':
        where.followUpDate = {
          gte: todayStart,
          lte: todayEnd,
        };
        break;
      case 'overdue':
        where.followUpDate = {
          lt: todayStart,
        };
        where.status = {
          notIn: ['CLOSED_WON', 'CLOSED_LOST'],
        };
        break;
      case 'upcoming':
        where.followUpDate = {
          gt: todayEnd,
          lte: sevenDaysFromNow,
        };
        break;
      case 'all':
        // No additional date filter; just businesses with followUpDate set
        break;
    }

    const businesses = await prisma.business.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        phone: true,
        category: true,
        status: true,
        priority: true,
        followUpDate: true,
        services: true,
        estimatedValue: true,
        notes: true,
        city: {
          select: {
            id: true,
            name: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            type: true,
            outcome: true,
            remark: true,
            createdAt: true,
          },
        },
      },
      orderBy: { followUpDate: 'asc' },
    });

    // Transform to include lastActivity as a single object instead of array
    const followups = businesses.map((business) => ({
      ...business,
      lastActivity: business.activities[0] || null,
      activities: undefined,
      cityName: business.city.name,
      areaName: business.area?.name || null,
    }));

    return successResponse(followups);
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(error.errors[0].message, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('Already exists', 409);
      if (error.code === 'P2025') return errorResponse('Not found', 404);
    }
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
