import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listBootcamps, createBootcamp } from '@/lib/services/bootcamps';

export const metadata = {
  title: 'Paid Course Builder',
};

/**
 * /bootcamps entry page.
 *
 * The Bootcamp is an invisible container — the user never needs to create it
 * manually. If no bootcamp row exists, we auto-provision the canonical one
 * silently, then redirect to `/bootcamps/[id]` where they see the course
 * grid with "+ Create new course".
 */
export default async function BootcampsEntryPage(): Promise<ReactNode> {
  const auth = await getSessionFromHeaders();
  if (!auth) {
    redirect('/login');
  }

  let bootcamps: Awaited<ReturnType<typeof listBootcamps>> = [];
  try {
    bootcamps = await listBootcamps();
  } catch {
    bootcamps = [];
  }

  // If a bootcamp exists, redirect straight to it
  if (bootcamps.length > 0) {
    const canonical =
      bootcamps.find((b) => b.slug === 'job-ready-bootcamp') ||
      bootcamps.find(
        (b) =>
          b.slug === 'paid-course-builder' ||
          b.slug === 'bootcamp' ||
          b.code === 'bootcamp'
      ) ||
      bootcamps[0];

    redirect(`/bootcamps/${canonical.id}`);
  }

  // No bootcamp exists — auto-provision the canonical one silently.
  // createBootcamp may throw on DB issues; redirect() also throws internally
  // in Next.js, so we must separate the two.
  let newBootcampId: string | null = null;
  try {
    const bootcamp = await createBootcamp({
      code: 'bootcamp',
      title: 'Paid Course Builder',
      slug: 'paid-course-builder',
      description: 'Standalone paid courses for direct student enrollment.',
      publish_status: 'published',
      created_by: auth.id,
    });
    newBootcampId = bootcamp.id;
  } catch {
    // DB error — fall through to error UI below
  }

  if (newBootcampId) {
    redirect(`/bootcamps/${newBootcampId}`);
  }

  // If we reach here, auto-provision failed. Show a simple retry message.
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Paid Course Builder Setup Failed</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Could not auto-provision the paid course builder container. This is usually a
        temporary database issue. Please refresh the page to try again.
      </p>
      <Link
        href="/bootcamps"
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Retry
      </Link>
    </div>
  );
}
