import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { CreateDealSchema } from '@/lib/validations';
import { assignFamilyId } from '@/lib/family-id';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/deals?businessId=xxx - List deals for a business
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return errorResponse('businessId query parameter is required', 400);
    }

    // Verify user has access to this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, createdById: true },
    });

    if (!business) {
      return errorResponse('Business not found', 404);
    }

    if (user.role === 'SALES' && business.createdById !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    const deals = await prisma.deal.findMany({
      where: { businessId },
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
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(deals);
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

// POST /api/deals - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const data = CreateDealSchema.parse(body);

    // Verify user has access to this business
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true, createdById: true, status: true },
    });

    if (!business) {
      return errorResponse('Business not found', 404);
    }

    if (user.role === 'SALES' && business.createdById !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    // Create deal and update business status in a transaction
    const deal = await prisma.$transaction(async (tx) => {
      const signedDate = data.signedDate ? new Date(data.signedDate) : new Date();
      const contractMonths = data.contractDurationMonths ?? 12;
      const renewalDate = new Date(signedDate);
      renewalDate.setMonth(renewalDate.getMonth() + contractMonths);

      const newDeal = await tx.deal.create({
        data: {
          businessId: data.businessId,
          service: data.service,
          amount: data.amount,
          paymentStatus: data.paymentStatus,
          paidAmount: data.paidAmount,
          signedDate,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
          invoiceNumber: data.invoiceNumber,
          notes: data.notes,
          contractDurationMonths: contractMonths,
          renewalDate,
          renewalNotes: data.renewalNotes,
          parentDealId: data.parentDealId,
          userId: user.id,
        },
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

      // Side effect: Ensure business status is CLOSED_WON when a deal is created
      if (business.status !== 'CLOSED_WON') {
        await tx.business.update({
          where: { id: data.businessId },
          data: { status: 'CLOSED_WON' },
        });
      }

      return newDeal;
    });

    // Auto-assign Family ID when first deal is created
    assignFamilyId(data.businessId).catch(console.error);

    return successResponse(deal, 'Deal created successfully');
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
