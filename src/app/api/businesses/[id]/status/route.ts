import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma, BusinessStatus, FailureReason } from '@prisma/client';
import { ZodError, z } from 'zod';

export const dynamic = 'force-dynamic';

const StatusUpdateSchema = z.object({
  status: z.enum([
    'NOT_VISITED',
    'VISITED',
    'INTERESTED',
    'NEGOTIATION',
    'CLOSED_WON',
    'CLOSED_LOST',
    'FOLLOW_UP',
  ]),
  followUpDate: z.string().optional(),
  failureReason: z
    .enum([
      'PRICE_ISSUE',
      'TRUST_ISSUE',
      'ALREADY_HAS_SERVICE',
      'NOT_DECISION_MAKER',
      'NOT_INTERESTED',
      'BAD_TIMING',
      'WENT_TO_COMPETITOR',
      'NO_BUDGET',
      'OTHER',
    ])
    .optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/businesses/[id]/status - Quick status update
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();

    const data = StatusUpdateSchema.parse(body);

    // Verify business exists and user has access
    const existing = await prisma.business.findUnique({
      where: { id, isActive: true },
      select: { id: true, createdById: true },
    });

    if (!existing) {
      return errorResponse('Business not found', 404);
    }

    // SALES users can only update their own businesses
    if (user.role === 'SALES' && existing.createdById !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    // Build update payload
    const updateData: Prisma.BusinessUpdateInput = {
      status: data.status as BusinessStatus,
    };

    // Set followUpDate when status is FOLLOW_UP
    if (data.status === 'FOLLOW_UP' && data.followUpDate) {
      updateData.followUpDate = new Date(data.followUpDate);
    }

    // Clear followUpDate when status moves to a terminal state
    if (data.status === 'CLOSED_WON' || data.status === 'CLOSED_LOST') {
      updateData.followUpDate = null;
    }

    // Set failureReason when status is CLOSED_LOST
    if (data.status === 'CLOSED_LOST' && data.failureReason) {
      updateData.failureReason = data.failureReason as FailureReason;
    }

    // Clear failureReason if status is not CLOSED_LOST
    if (data.status !== 'CLOSED_LOST') {
      updateData.failureReason = null;
    }

    const business = await prisma.business.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        businessName: true,
        status: true,
        followUpDate: true,
        failureReason: true,
        updatedAt: true,
      },
    });

    return successResponse(business, 'Status updated successfully');
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
