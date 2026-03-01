import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET /api/leads - List incoming leads (ADMIN/MANAGER only)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = parseInt(url.searchParams.get('limit') ?? '25', 10);
    const status = url.searchParams.get('status') ?? '';
    const search = url.searchParams.get('search') ?? '';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.incomingLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.incomingLead.count({ where }),
    ]);

    return paginatedResponse(leads, total, page, limit);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}

// PATCH /api/leads - Update lead status/notes
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const { id, status, notes, assignedToId } = body;

    if (!id) return errorResponse('Lead ID required', 400);

    const lead = await prisma.incomingLead.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(assignedToId !== undefined && { assignedToId }),
      },
    });

    return successResponse(lead);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
