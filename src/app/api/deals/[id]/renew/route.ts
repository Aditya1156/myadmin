import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const RenewDealSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'REFUNDED']).default('PENDING'),
  paidAmount: z.number().min(0).default(0),
  contractDurationMonths: z.number().int().min(1).max(60).default(12),
  notes: z.string().optional(),
});

// POST /api/deals/[id]/renew - Create a renewal deal linked to parent
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const parentDeal = await prisma.deal.findUnique({
      where: { id },
      select: {
        id: true,
        service: true,
        businessId: true,
        userId: true,
        renewalStatus: true,
        business: { select: { createdById: true } },
      },
    });

    if (!parentDeal) {
      return errorResponse('Deal not found', 404);
    }

    if (user.role === 'SALES' && parentDeal.userId !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    if (parentDeal.renewalStatus === 'RENEWED') {
      return errorResponse('This deal has already been renewed', 400);
    }

    const body = await request.json();
    const data = RenewDealSchema.parse(body);

    const signedDate = new Date();
    const contractMonths = data.contractDurationMonths;
    const renewalDate = new Date(signedDate);
    renewalDate.setMonth(renewalDate.getMonth() + contractMonths);

    // Transaction: create new deal + mark parent as RENEWED
    const newDeal = await prisma.$transaction(async (tx) => {
      // Mark parent as renewed
      await tx.deal.update({
        where: { id: parentDeal.id },
        data: { renewalStatus: 'RENEWED' },
      });

      // Create renewal deal
      return tx.deal.create({
        data: {
          businessId: parentDeal.businessId,
          service: parentDeal.service,
          amount: data.amount,
          paymentStatus: data.paymentStatus,
          paidAmount: data.paidAmount,
          signedDate,
          contractDurationMonths: contractMonths,
          renewalDate,
          renewalStatus: 'PENDING',
          notes: data.notes,
          parentDealId: parentDeal.id,
          userId: user.id,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          business: { select: { id: true, businessName: true } },
        },
      });
    });

    return successResponse(newDeal, 'Deal renewed successfully');
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
