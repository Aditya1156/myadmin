import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { CreateAreaSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/areas - List areas, filtered by cityId query parameter
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const cityId = searchParams.get('cityId');
    const search = searchParams.get('search') || '';

    const where: Prisma.AreaWhereInput = {};

    // Filter by cityId if provided
    if (cityId) {
      where.cityId = cityId;
    }

    // SALES users can only see areas in cities assigned to them
    if (user.role === 'SALES') {
      where.city = {
        assignedToId: user.id,
        isActive: true,
      };
    } else {
      // ADMIN/MANAGER see all but only from active cities
      where.city = {
        isActive: true,
      };
    }

    // Optional search filter
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const areas = await prisma.area.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });

    return successResponse(areas);
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

// POST /api/areas - Create a new area
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const data = CreateAreaSchema.parse(body);

    // Verify the city exists and is active
    const city = await prisma.city.findFirst({
      where: {
        id: data.cityId,
        isActive: true,
      },
    });

    if (!city) {
      return errorResponse('City not found', 404);
    }

    // SALES users can only create areas in cities assigned to them
    if (user.role === 'SALES' && city.assignedToId !== user.id) {
      throw new Error('Forbidden');
    }

    const area = await prisma.area.create({
      data: {
        name: data.name,
        cityId: data.cityId,
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
            businesses: true,
          },
        },
      },
    });

    return successResponse(area, 'Area created successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('An area with this name already exists in the same city', 409);
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
