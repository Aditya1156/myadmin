import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// DELETE /api/activities/[id] - Delete own activity (within 1 hour of creation)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        createdAt: true,
      },
    });

    if (!activity) {
      return errorResponse('Activity not found', 404);
    }

    // Only the owner can delete their own activity
    if (activity.userId !== user.id) {
      return errorResponse('You can only delete your own activities', 403);
    }

    // Check if the activity was created within the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (activity.createdAt < oneHourAgo) {
      return errorResponse('Activities can only be deleted within 1 hour of creation', 403);
    }

    await prisma.activity.delete({
      where: { id: params.id },
    });

    return successResponse(null, 'Activity deleted successfully');
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
