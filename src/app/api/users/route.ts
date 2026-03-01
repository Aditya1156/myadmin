import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/users - List all users with stats (ADMIN/MANAGER only)
export async function GET() {
  try {
    const user = await requireAuth();

    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
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
        _count: {
          select: {
            businesses: true,
            activities: true,
            deals: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch revenue per user with a separate aggregation
    const revenueByUser = await prisma.deal.groupBy({
      by: ['userId'],
      _sum: {
        amount: true,
      },
    });

    const revenueMap = new Map(
      revenueByUser.map((r) => [r.userId, r._sum.amount || 0])
    );

    const usersWithStats = users.map((u) => ({
      id: u.id,
      clerkId: u.clerkId,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      assignedCities: u.assignedCities,
      businessCount: u._count.businesses,
      activityCount: u._count.activities,
      dealCount: u._count.deals,
      revenue: revenueMap.get(u.id) || 0,
    }));

    return successResponse(usersWithStats);
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

const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES']),
});

// POST /api/users - Create a new team member (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!isAdmin(user)) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = CreateUserSchema.parse(body);

    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Create user in Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      emailAddress: [data.email],
      password: data.password,
      firstName,
      lastName,
    });

    // Create user in database
    const dbUser = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        name: data.name.trim(),
        email: data.email,
        role: data.role,
      },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'user_created',
      entityType: 'User',
      entityId: dbUser.id,
      details: { name: data.name, email: data.email, role: data.role },
    });

    return successResponse(dbUser, 'Team member created successfully');
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(error.errors[0].message, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('A user with this email already exists', 409);
    }
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    // Handle Clerk API errors
    if (error && typeof error === 'object' && 'errors' in error) {
      const clerkErrors = (error as { errors: Array<{ message: string }> }).errors;
      if (clerkErrors?.[0]?.message) {
        return errorResponse(clerkErrors[0].message, 400);
      }
    }
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
