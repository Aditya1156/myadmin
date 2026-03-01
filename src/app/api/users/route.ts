import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/users - List all users with stats (ADMIN/MANAGER only)
export async function GET() {
  try {
    const user = await requireAuth();

    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        assignedCities: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            businesses: true,
            activities: true,
            deals: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch revenue per user with a separate aggregation
    const revenueByUser = await prisma.deal.groupBy({
      by: ['userId'],
      _sum: {
        amount: true,
      },
    });

    const revenueMap = new Map(
      revenueByUser.map((r) => [r.userId, r._sum.amount || 0])
    );

    const usersWithStats = users.map((u) => ({
      id: u.id,
      clerkId: u.clerkId,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      assignedCities: u.assignedCities,
      businessCount: u._count.businesses,
      activityCount: u._count.activities,
      dealCount: u._count.deals,
      revenue: revenueMap.get(u.id) || 0,
    }));

    return successResponse(usersWithStats);
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
