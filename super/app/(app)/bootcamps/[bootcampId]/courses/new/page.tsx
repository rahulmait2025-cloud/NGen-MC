import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getBootcampById } from '@/lib/services/bootcamps';
import { resolveBootcampByKey } from '@/lib/resolvers';
import { isUuid } from '@/lib/utils/slug';
import { NewBootcampCourseView } from './new-bootcamp-course-view';

export default async function NewBootcampCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ bootcampId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const { bootcampId } = await params;
  const bootcampKey = bootcampId;
  const resolvedSearchParams = await searchParams;

  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const resolved = await resolveBootcampByKey(bootcampKey);
  if (!resolved) {
    notFound();
  }

  if (isUuid(bootcampKey) && resolved.slug) {
    const searchParamsQuery = new URLSearchParams(resolvedSearchParams as Record<string, string>).toString();
    const queryString = searchParamsQuery ? `?${searchParamsQuery}` : '';
    redirect(`/bootcamps/${resolved.slug}/courses/new${queryString}`);
  }

  const bootcamp = await getBootcampById(resolved.id);
  if (!bootcamp) {
    notFound();
  }

  return <NewBootcampCourseView bootcampId={resolved.id} bootcampTitle={bootcamp.title} />;
}
