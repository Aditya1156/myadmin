import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateUserSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'SALES']).optional(),
  assignedCityIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/users/[id] - Update user role and assign cities (ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    if (!isAdmin(user)) {
      return errorResponse('Forbidden', 403);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    const body = await request.json();
    const data = UpdateUserSchema.parse(body);

    // Use transaction to update user and city assignments atomically
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update role and active status if provided
      const updateData: Prisma.UserUpdateInput = {};
      if (data.role !== undefined) {
        updateData.role = data.role;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      // If assignedCityIds is provided, update city assignments
      if (data.assignedCityIds !== undefined) {
        // First, unassign all cities currently assigned to this user
        await tx.city.updateMany({
          where: { assignedToId: params.id },
          data: { assignedToId: null },
        });

        // Then, assign the new cities
        if (data.assignedCityIds.length > 0) {
          await tx.city.updateMany({
            where: { id: { in: data.assignedCityIds } },
            data: { assignedToId: params.id },
          });
        }
      }

      const result = await tx.user.update({
        where: { id: params.id },
        data: updateData,
        select: {
          id: true,
          clerkId: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          assignedCities: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return result;
    });

    return successResponse(updatedUser, 'User updated successfully');
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
