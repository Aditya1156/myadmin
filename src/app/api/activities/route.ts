import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { CreateActivitySchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/activities?businessId=xxx - List activities for a business
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const businessId = searchParams.get('businessId');
    const limitParam = searchParams.get('limit');

    // If businessId is provided, return activities for that business
    if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, createdById: true, cityId: true },
      });

      if (!business) {
        return errorResponse('Business not found', 404);
      }

      if (user.role === 'SALES' && business.createdById !== user.id) {
        return errorResponse('Forbidden', 403);
      }

      const activities = await prisma.activity.findMany({
        where: { businessId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          business: {
            select: { id: true, businessName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse(activities);
    }

    // No businessId — return recent activities for the current user (dashboard feed)
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 15;

    const where: Prisma.ActivityWhereInput = {};
    if (user.role === 'SALES') {
      where.userId = user.id;
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        business: {
          select: { id: true, businessName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return successResponse(activities);
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

// POST /api/activities - Create a new activity
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const data = CreateActivitySchema.parse(body);

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

    // Create activity and apply side effects in a transaction
    const activity = await prisma.$transaction(async (tx) => {
      const newActivity = await tx.activity.create({
        data: {
          businessId: data.businessId,
          type: data.type,
          outcome: data.outcome,
          remark: data.remark,
          nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
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
        },
      });

      // Side effect 1: If nextFollowUpDate is set, update business.followUpDate
      if (data.nextFollowUpDate) {
        await tx.business.update({
          where: { id: data.businessId },
          data: { followUpDate: new Date(data.nextFollowUpDate) },
        });
      }

      // Side effect 2: If outcome=POSITIVE and business.status=NOT_VISITED, set status=VISITED
      if (data.outcome === 'POSITIVE' && business.status === 'NOT_VISITED') {
        await tx.business.update({
          where: { id: data.businessId },
          data: { status: 'VISITED' },
        });
      }

      return newActivity;
    });

    return successResponse(activity, 'Activity created successfully');
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
