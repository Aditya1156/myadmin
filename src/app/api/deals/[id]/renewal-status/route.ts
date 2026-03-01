import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UpdateRenewalStatusSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/deals/[id]/renewal-status - Update renewal status on a deal
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const existingDeal = await prisma.deal.findUnique({
      where: { id },
      select: { id: true, userId: true, business: { select: { createdById: true } } },
    });

    if (!existingDeal) {
      return errorResponse('Deal not found', 404);
    }

    if (user.role === 'SALES' && existingDeal.userId !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = UpdateRenewalStatusSchema.parse(body);

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        renewalStatus: data.renewalStatus,
        ...(data.renewalNotes !== undefined && { renewalNotes: data.renewalNotes }),
      },
      select: {
        id: true,
        renewalStatus: true,
        renewalNotes: true,
        renewalDate: true,
        service: true,
        amount: true,
      },
    });

    return successResponse(deal, 'Renewal status updated');
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(error.errors[0].message, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return errorResponse('Not found', 404);
    }
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
