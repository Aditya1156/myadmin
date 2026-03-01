import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

const UpdateAreaSchema = z.object({
  name: z.string().min(2, 'Area name must be at least 2 characters'),
});

// PUT /api/areas/[id] - Update an area
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = params;

    const body = await request.json();
    const data = UpdateAreaSchema.parse(body);

    // Verify the area exists and get its city info
    const existing = await prisma.area.findUnique({
      where: { id },
      include: {
        city: {
          select: {
            id: true,
            isActive: true,
            assignedToId: true,
          },
        },
      },
    });

    if (!existing || !existing.city.isActive) {
      return errorResponse('Area not found', 404);
    }

    // SALES users can only update areas in cities assigned to them
    if (user.role === 'SALES' && existing.city.assignedToId !== user.id) {
      throw new Error('Forbidden');
    }

    const area = await prisma.area.update({
      where: { id },
      data: {
        name: data.name,
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: true,
          },
        },
        _count: {
          select: {
            businesses: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return successResponse(area, 'Area updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('An area with this name already exists in the same city', 409);
      if (error.code === 'P2025') return errorResponse('Area not found', 404);
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}

// DELETE /api/areas/[id] - Delete an area (only if no businesses are linked)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = params;

    // Verify the area exists and get its city info
    const existing = await prisma.area.findUnique({
      where: { id },
      include: {
        city: {
          select: {
            id: true,
            isActive: true,
            assignedToId: true,
          },
        },
        _count: {
          select: {
            businesses: true,
          },
        },
      },
    });

    if (!existing || !existing.city.isActive) {
      return errorResponse('Area not found', 404);
    }

    // SALES users can only delete areas in cities assigned to them
    if (user.role === 'SALES' && existing.city.assignedToId !== user.id) {
      throw new Error('Forbidden');
    }

    // Prevent deletion if area has any businesses (active or inactive)
    if (existing._count.businesses > 0) {
      return errorResponse(
        'Cannot delete area with existing businesses. Remove or reassign all businesses first.',
        409
      );
    }

    await prisma.area.delete({
      where: { id },
    });

    return successResponse({ id }, 'Area deleted successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('Already exists', 409);
      if (error.code === 'P2025') return errorResponse('Area not found', 404);
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
