import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { FreeCourseForm } from './free-course-form-client';

export default async function NewFreeCoursePage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/free-courses">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Create Free Course</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Start a new curated free course. You will configure curriculum and imports in the builder.
        </p>
      </div>
      <FreeCourseForm />
    </div>
  );
}
