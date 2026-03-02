import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import {
  CreateBusinessSchema,
  PaginationSchema,
  BusinessFiltersSchema,
} from '@/lib/validations';
import { Prisma, BusinessCategory, BusinessStatus, Priority, ServiceType, VisitType, FailureReason } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/businesses - Paginated list with full filter support
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;

    // Parse pagination
    const { page, limit, sortBy, sortOrder } = PaginationSchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    });

    // Parse filters
    const filters = BusinessFiltersSchema.parse({
      cityId: searchParams.get('cityId') ?? undefined,
      areaId: searchParams.get('areaId') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      services: searchParams.get('services') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      createdById: searchParams.get('createdById') ?? undefined,
      followUpOverdue: searchParams.get('followUpOverdue') ?? undefined,
    });

    // Build where clause
    const where: Prisma.BusinessWhereInput = {
      isActive: true,
    };

    // SALES users can only see their own businesses
    if (user.role === 'SALES') {
      where.createdById = user.id;
    }

    // Apply filters
    if (filters.cityId) {
      where.cityId = filters.cityId;
    }

    if (filters.areaId) {
      where.areaId = filters.areaId;
    }

    if (filters.category) {
      where.category = filters.category as BusinessCategory;
    }

    if (filters.status) {
      where.status = filters.status as BusinessStatus;
    }

    if (filters.priority) {
      where.priority = filters.priority as Priority;
    }

    if (filters.services) {
      const serviceList = filters.services.split(',').filter(Boolean) as ServiceType[];
      if (serviceList.length > 0) {
        where.services = {
          hasSome: serviceList,
        };
      }
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { businessName: { contains: searchTerm, mode: 'insensitive' } },
        { ownerName: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
        { familyId: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.createdById && user.role !== 'SALES') {
      // SALES users already filtered above; admins/managers can filter by createdById
      where.createdById = filters.createdById;
    }

    if (filters.followUpOverdue === 'true') {
      where.followUpDate = {
        lt: new Date(),
      };
      where.status = {
        notIn: ['CLOSED_WON', 'CLOSED_LOST'],
      };
    }

    // Validate sortBy field to prevent injection
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'businessName',
      'ownerName',
      'priority',
      'status',
      'category',
      'estimatedValue',
      'followUpDate',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Execute count and find in parallel
    const [total, businesses] = await Promise.all([
      prisma.business.count({ where }),
      prisma.business.findMany({
        where,
        select: {
          id: true,
          familyId: true,
          businessName: true,
          ownerName: true,
          phone: true,
          alternatePhone: true,
          category: true,
          address: true,
          hasWebsite: true,
          hasGBP: true,
          services: true,
          priority: true,
          status: true,
          visitType: true,
          followUpDate: true,
          failureReason: true,
          estimatedValue: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          cityId: true,
          areaId: true,
          createdById: true,
          city: {
            select: {
              id: true,
              name: true,
            },
          },
          area: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          [safeSortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return paginatedResponse(businesses, total, page, limit);
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

// POST /api/businesses - Create a new business
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const data = CreateBusinessSchema.parse(body);

    const business = await prisma.business.create({
      data: {
        businessName: data.businessName,
        ownerName: data.ownerName,
        phone: data.phone,
        alternatePhone: data.alternatePhone || null,
        category: data.category as BusinessCategory,
        cityId: data.cityId,
        areaId: data.areaId || null,
        address: data.address || null,
        googleMapsLink: data.googleMapsLink || null,
        hasWebsite: data.hasWebsite,
        existingWebsite: data.existingWebsite || null,
        hasGBP: data.hasGBP,
        services: data.services as ServiceType[],
        priority: data.priority as Priority,
        status: data.status as BusinessStatus,
        visitType: data.visitType ? (data.visitType as VisitType) : null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        estimatedValue: data.estimatedValue ?? null,
        notes: data.notes || null,
        mistakeNotes: data.mistakeNotes || null,
        failureReason: data.failureReason ? (data.failureReason as FailureReason) : null,
        createdById: user.id,
      },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        phone: true,
        alternatePhone: true,
        category: true,
        address: true,
        googleMapsLink: true,
        hasWebsite: true,
        existingWebsite: true,
        hasGBP: true,
        services: true,
        priority: true,
        status: true,
        visitType: true,
        followUpDate: true,
        failureReason: true,
        estimatedValue: true,
        notes: true,
        mistakeNotes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        cityId: true,
        areaId: true,
        createdById: true,
        city: {
          select: {
            id: true,
            name: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return successResponse(business, 'Business created successfully');
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
