import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmins } from '@/lib/notifications';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const IncomingLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  message: z.string().min(1, 'Message is required').max(5000),
  source: z.string().max(100).optional(),
  pageUrl: z.string().max(500).optional(),
});

// POST /api/leads/incoming - Public endpoint for website contact forms
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') ?? '';
    const body = await request.json();
    const data = IncomingLeadSchema.parse(body);

    const lead = await prisma.incomingLead.create({
      data: {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        message: data.message.trim(),
        source: data.source || 'website',
        pageUrl: data.pageUrl || null,
      },
    });

    await notifyAdmins({
      type: 'new_lead',
      title: 'New Website Lead',
      message: `${data.name} submitted a message: "${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}"`,
      link: '/leads',
    });

    const response = NextResponse.json(
      { success: true, message: 'Thank you! We will get back to you soon.', id: lead.id },
      { status: 201 }
    );

    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('[Lead Capture Error]', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', origin || '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}
