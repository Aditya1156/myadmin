import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import type { User, Role } from '@prisma/client';

export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(roles: Role[]): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
}

export function isAdmin(user: User): boolean {
  return user.role === 'ADMIN';
}

export function isManager(user: User): boolean {
  return user.role === 'MANAGER';
}

export function isAdminOrManager(user: User): boolean {
  return user.role === 'ADMIN' || user.role === 'MANAGER';
}

// Master admin email — automatically gets ADMIN role on first sync
const MASTER_ADMIN_EMAIL = 'adityaissc7@gmail.com';

export async function syncUser(): Promise<User> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error('No Clerk user found');
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const isMasterAdmin = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
      email,
      ...(isMasterAdmin && { role: 'ADMIN' as Role }),
    },
    create: {
      clerkId: clerkUser.id,
      name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
      email,
      role: isMasterAdmin ? 'ADMIN' : 'SALES',
    },
  });

  return user;
}
