import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UpdateDealSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// PUT /api/deals/[id] - Update a deal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const existingDeal = await prisma.deal.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        business: {
          select: { createdById: true },
        },
      },
    });

    if (!existingDeal) {
      return errorResponse('Deal not found', 404);
    }

    // SALES users can only update their own deals
    if (user.role === 'SALES' && existingDeal.userId !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = UpdateDealSchema.parse(body);

    // Recompute renewalDate if signedDate or contractDurationMonths changes
    const updateData: Record<string, unknown> = {
      ...(data.service !== undefined && { service: data.service }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
      ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount }),
      ...(data.signedDate !== undefined && { signedDate: new Date(data.signedDate) }),
      ...(data.deliveryDate !== undefined && { deliveryDate: new Date(data.deliveryDate) }),
      ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.contractDurationMonths !== undefined && { contractDurationMonths: data.contractDurationMonths }),
      ...(data.renewalNotes !== undefined && { renewalNotes: data.renewalNotes }),
    };

    // If signedDate or contractDurationMonths changed, recompute renewalDate
    if (data.signedDate !== undefined || data.contractDurationMonths !== undefined) {
      const currentDeal = await prisma.deal.findUnique({
        where: { id: params.id },
        select: { signedDate: true, contractDurationMonths: true },
      });
      if (currentDeal) {
        const baseDate = data.signedDate ? new Date(data.signedDate) : currentDeal.signedDate;
        const months = data.contractDurationMonths ?? currentDeal.contractDurationMonths;
        const newRenewalDate = new Date(baseDate);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + months);
        updateData.renewalDate = newRenewalDate;
      }
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        business: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    return successResponse(deal, 'Deal updated successfully');
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

// DELETE /api/deals/[id] - Delete a deal (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    if (!isAdmin(user)) {
      return errorResponse('Forbidden', 403);
    }

    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!deal) {
      return errorResponse('Deal not found', 404);
    }

    await prisma.deal.delete({
      where: { id: params.id },
    });

    return successResponse(null, 'Deal deleted successfully');
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
