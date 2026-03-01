import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { CreateCitySchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/cities - List all cities with area count and business count
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || '';

    // Build where clause based on role
    const where: Prisma.CityWhereInput = {
      isActive: true,
    };

    // SALES users can only see cities assigned to them
    if (user.role === 'SALES') {
      where.assignedToId = user.id;
    }

    // Optional search filter
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const cities = await prisma.city.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });

    return successResponse(cities);
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

// POST /api/cities - Create a new city (ADMIN/MANAGER only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!isAdminOrManager(user)) {
      throw new Error('Forbidden');
    }

    const body = await request.json();
    const data = CreateCitySchema.parse(body);

    const city = await prisma.city.create({
      data: {
        name: data.name,
        state: data.state,
        totalShops: data.totalShops,
        notes: data.notes,
        assignedToId: data.assignedToId,
      },
      include: {
        _count: {
          select: {
            areas: true,
            businesses: true,
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

    return successResponse(city, 'City created successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('A city with this name already exists in the same state', 409);
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
