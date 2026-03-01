import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

export const dynamic = 'force-dynamic';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserEvent {
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
    phone_numbers?: Array<{ phone_number: string }>;
  };
  type: string;
}

// POST /api/webhooks/clerk - Handle Clerk webhook events
export async function POST(request: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error('[Webhook Error] CLERK_WEBHOOK_SECRET is not set');
      return errorResponse('Webhook secret not configured', 500);
    }

    // Get the headers for verification
    const headerPayload = headers();
    const svixId = headerPayload.get('svix-id');
    const svixTimestamp = headerPayload.get('svix-timestamp');
    const svixSignature = headerPayload.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return errorResponse('Missing svix headers', 400);
    }

    // Get the raw body
    const payload = await request.text();

    // Verify the webhook signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let event: ClerkUserEvent;

    try {
      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkUserEvent;
    } catch (err) {
      console.error('[Webhook Error] Signature verification failed:', err);
      return errorResponse('Invalid webhook signature', 400);
    }

    const { type, data } = event;

    switch (type) {
      case 'user.created': {
        const primaryEmail = data.email_addresses.find(
          (e) => e.id === data.primary_email_address_id
        );
        const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Unknown';
        const email = primaryEmail?.email_address ?? '';
        const phone = data.phone_numbers?.[0]?.phone_number ?? null;

        await prisma.user.upsert({
          where: { clerkId: data.id },
          update: {
            name,
            email,
            phone,
          },
          create: {
            clerkId: data.id,
            name,
            email,
            phone,
            role: 'SALES',
          },
        });

        break;
      }

      case 'user.updated': {
        const primaryEmail = data.email_addresses.find(
          (e) => e.id === data.primary_email_address_id
        );
        const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Unknown';
        const email = primaryEmail?.email_address ?? '';
        const phone = data.phone_numbers?.[0]?.phone_number ?? null;

        await prisma.user.upsert({
          where: { clerkId: data.id },
          update: {
            name,
            email,
            phone,
          },
          create: {
            clerkId: data.id,
            name,
            email,
            phone,
            role: 'SALES',
          },
        });

        break;
      }

      case 'user.deleted': {
        // Soft delete: mark user as inactive rather than removing
        await prisma.user.updateMany({
          where: { clerkId: data.id },
          data: { isActive: false },
        });

        break;
      }

      default: {
        // Unhandled event type - log and acknowledge
        console.log(`[Webhook] Unhandled event type: ${type}`);
      }
    }

    return successResponse(null, 'Webhook processed successfully');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('Already exists', 409);
      if (error.code === 'P2025') return errorResponse('Not found', 404);
    }
    console.error('[Webhook Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
