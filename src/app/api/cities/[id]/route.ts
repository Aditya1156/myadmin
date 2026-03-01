import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager, isAdmin } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UpdateCitySchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/cities/[id] - Get a single city with areas and business summary
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = params;

    // Build where clause based on role
    const where: Prisma.CityWhereInput = {
      id,
      isActive: true,
    };

    // SALES users can only see cities assigned to them
    if (user.role === 'SALES') {
      where.assignedToId = user.id;
    }

    const city = await prisma.city.findFirst({
      where,
      include: {
        areas: {
          include: {
            _count: {
              select: {
                businesses: {
                  where: { isActive: true },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            areas: true,
            businesses: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!city) {
      return errorResponse('City not found', 404);
    }

    // Compute business summary by status
    const businessSummary = await prisma.business.groupBy({
      by: ['status'],
      where: {
        cityId: id,
        isActive: true,
      },
      _count: {
        status: true,
      },
    });

    const summary = businessSummary.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>
    );

    return successResponse({
      ...city,
      businessSummary: summary,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('Already exists', 409);
      if (error.code === 'P2025') return errorResponse('Not found', 404);
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

// PUT /api/cities/[id] - Update a city (ADMIN/MANAGER only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = params;

    if (!isAdminOrManager(user)) {
      throw new Error('Forbidden');
    }

    const body = await request.json();
    const data = UpdateCitySchema.parse(body);

    const city = await prisma.city.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.totalShops !== undefined && { totalShops: data.totalShops }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
      },
      include: {
        _count: {
          select: {
            areas: true,
            businesses: {
              where: { isActive: true },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return successResponse(city, 'City updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('A city with this name already exists in the same state', 409);
      if (error.code === 'P2025') return errorResponse('City not found', 404);
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

// DELETE /api/cities/[id] - Soft delete a city (ADMIN only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = params;

    if (!isAdmin(user)) {
      throw new Error('Forbidden');
    }

    // Verify city exists
    const existing = await prisma.city.findUnique({
      where: { id },
    });

    if (!existing || !existing.isActive) {
      return errorResponse('City not found', 404);
    }

    // Soft delete: set isActive to false
    const city = await prisma.city.update({
      where: { id },
      data: { isActive: false },
    });

    // Also soft delete all businesses in this city
    await prisma.business.updateMany({
      where: { cityId: id },
      data: { isActive: false },
    });

    return successResponse(city, 'City deleted successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('Already exists', 409);
      if (error.code === 'P2025') return errorResponse('City not found', 404);
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
