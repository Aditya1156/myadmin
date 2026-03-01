import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { clerkClient } from '@clerk/nextjs/server';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// POST /api/users/[id]/reset-password - Reset a team member's password (ADMIN only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAuth();
    if (!isAdmin(adminUser)) {
      return errorResponse('Forbidden', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const data = ResetPasswordSchema.parse(body);

    // Find the user in DB to get their clerkId
    const dbUser = await prisma.user.findUnique({
      where: { id },
      select: { clerkId: true, name: true, email: true },
    });

    if (!dbUser) {
      return errorResponse('User not found', 404);
    }

    // Update password in Clerk
    const client = await clerkClient();
    await client.users.updateUser(dbUser.clerkId, {
      password: data.newPassword,
    });

    await createAuditLog({
      userId: adminUser.id,
      action: 'password_reset',
      entityType: 'User',
      entityId: id,
      details: { targetEmail: dbUser.email },
    });

    return successResponse({ success: true }, 'Password reset successfully');
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message, 400);
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
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
