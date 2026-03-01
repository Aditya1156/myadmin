import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="mx-auto max-w-2xl text-center px-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Building2 className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">TheNextURL</h1>
        </div>
        <p className="text-xl text-muted-foreground mb-2">Sales CRM</p>
        <p className="text-lg text-muted-foreground mb-8">
          Sales territory tracking & CRM for field sales agents pitching digital services to local
          businesses across Karnataka.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/sign-in">
            <Button size="lg">
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="outline" size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Making local brands digital, taking them global.
        </p>
      </div>
    </div>
  );
}
