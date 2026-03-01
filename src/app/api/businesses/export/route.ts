import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BusinessFiltersSchema } from '@/lib/validations';
import { Prisma, BusinessCategory, BusinessStatus, Priority, ServiceType } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/businesses/export - Export filtered results as JSON data for client-side Excel generation
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Only admins and managers can export
    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = request.nextUrl;

    // Parse filters (same as list endpoint)
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
      ];
    }

    if (filters.createdById) {
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

    // Fetch all matching businesses with full details for export
    const businesses = await prisma.business.findMany({
      where,
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
        createdAt: true,
        updatedAt: true,
        city: {
          select: {
            name: true,
          },
        },
        area: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            activities: true,
            deals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Flatten the data for easy Excel generation on the client
    const exportData = businesses.map((b) => ({
      id: b.id,
      businessName: b.businessName,
      ownerName: b.ownerName,
      phone: b.phone,
      alternatePhone: b.alternatePhone ?? '',
      category: b.category,
      cityName: b.city.name,
      areaName: b.area?.name ?? '',
      address: b.address ?? '',
      googleMapsLink: b.googleMapsLink ?? '',
      hasWebsite: b.hasWebsite ? 'Yes' : 'No',
      existingWebsite: b.existingWebsite ?? '',
      hasGBP: b.hasGBP ? 'Yes' : 'No',
      services: b.services.join(', '),
      priority: b.priority,
      status: b.status,
      visitType: b.visitType ?? '',
      followUpDate: b.followUpDate ? b.followUpDate.toISOString().split('T')[0] : '',
      failureReason: b.failureReason ?? '',
      estimatedValue: b.estimatedValue ?? '',
      notes: b.notes ?? '',
      mistakeNotes: b.mistakeNotes ?? '',
      createdByName: b.createdBy.name,
      createdByEmail: b.createdBy.email,
      activityCount: b._count.activities,
      dealCount: b._count.deals,
      createdAt: b.createdAt.toISOString().split('T')[0],
      updatedAt: b.updatedAt.toISOString().split('T')[0],
    }));

    return successResponse(
      {
        businesses: exportData,
        totalCount: exportData.length,
        exportedAt: new Date().toISOString(),
      },
      'Export data ready'
    );
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
