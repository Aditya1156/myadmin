import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UpdateBusinessSchema } from '@/lib/validations';
import { Prisma, BusinessCategory, BusinessStatus, Priority, ServiceType, VisitType, FailureReason } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/businesses/[id] - Full detail with activities + deals
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const business = await prisma.business.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        familyId: true,
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
            state: true,
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
            email: true,
          },
        },
        activities: {
          select: {
            id: true,
            type: true,
            outcome: true,
            remark: true,
            nextFollowUpDate: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        deals: {
          select: {
            id: true,
            service: true,
            amount: true,
            paymentStatus: true,
            paidAmount: true,
            signedDate: true,
            deliveryDate: true,
            invoiceNumber: true,
            notes: true,
            createdAt: true,
            contractDurationMonths: true,
            renewalDate: true,
            renewalStatus: true,
            renewalNotes: true,
            parentDealId: true,
            parentDeal: {
              select: { id: true, service: true, signedDate: true, amount: true },
            },
            renewedDeals: {
              select: { id: true, service: true, signedDate: true, amount: true, renewalStatus: true },
            },
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            activities: true,
            deals: true,
          },
        },
      },
    });

    if (!business) {
      return errorResponse('Business not found', 404);
    }

    // SALES users can only view their own businesses
    if (user.role === 'SALES' && business.createdById !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    return successResponse(business);
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

// PUT /api/businesses/[id] - Update business
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();

    const data = UpdateBusinessSchema.parse(body);

    // Check business exists and user has access
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

    // Build update data dynamically from validated fields
    const updateData: Prisma.BusinessUpdateInput = {};

    if (data.businessName !== undefined) updateData.businessName = data.businessName;
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.alternatePhone !== undefined) updateData.alternatePhone = data.alternatePhone || null;
    if (data.category !== undefined) updateData.category = data.category as BusinessCategory;
    if (data.cityId !== undefined) updateData.city = { connect: { id: data.cityId } };
    if (data.areaId !== undefined) {
      if (data.areaId) {
        updateData.area = { connect: { id: data.areaId } };
      } else {
        updateData.area = { disconnect: true };
      }
    }
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.googleMapsLink !== undefined) updateData.googleMapsLink = data.googleMapsLink || null;
    if (data.hasWebsite !== undefined) updateData.hasWebsite = data.hasWebsite;
    if (data.existingWebsite !== undefined) updateData.existingWebsite = data.existingWebsite || null;
    if (data.hasGBP !== undefined) updateData.hasGBP = data.hasGBP;
    if (data.services !== undefined) updateData.services = data.services as ServiceType[];
    if (data.priority !== undefined) updateData.priority = data.priority as Priority;
    if (data.status !== undefined) updateData.status = data.status as BusinessStatus;
    if (data.visitType !== undefined) updateData.visitType = data.visitType ? (data.visitType as VisitType) : null;
    if (data.followUpDate !== undefined) updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue ?? null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.mistakeNotes !== undefined) updateData.mistakeNotes = data.mistakeNotes || null;
    if (data.failureReason !== undefined) updateData.failureReason = data.failureReason ? (data.failureReason as FailureReason) : null;

    const business = await prisma.business.update({
      where: { id },
      data: updateData,
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

    return successResponse(business, 'Business updated successfully');
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

// DELETE /api/businesses/[id] - Soft delete (ADMIN only)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(['ADMIN']);
    const { id } = await context.params;

    // Verify business exists
    const existing = await prisma.business.findUnique({
      where: { id, isActive: true },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse('Business not found', 404);
    }

    // Soft delete - set isActive to false
    await prisma.business.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse({ id }, 'Business deleted successfully');
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
