import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/deals/summary - Get revenue summary for current month
export async function GET() {
  try {
    const user = await requireAuth();

    // Calculate current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Build where clause based on role
    const where: Prisma.DealWhereInput = {
      signedDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    // SALES users can only see their own deals
    if (user.role === 'SALES') {
      where.userId = user.id;
    }

    const deals = await prisma.deal.findMany({
      where,
      select: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalDeals = deals.length;
    const totalRevenue = deals.reduce((sum, deal) => sum + deal.amount, 0);
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    const paidAmount = deals.reduce((sum, deal) => sum + deal.paidAmount, 0);
    const pendingAmount = totalRevenue - paidAmount;

    return successResponse({
      totalDeals,
      totalRevenue,
      avgDealSize: Math.round(avgDealSize * 100) / 100,
      paidAmount,
      pendingAmount,
    });
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
