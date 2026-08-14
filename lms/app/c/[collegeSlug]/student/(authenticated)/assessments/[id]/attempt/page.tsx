import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { startAttempt, getAttemptState } from '@/lib/services/assessments';
import { AttemptClient } from './attempt-client';

export default async function AssessmentAttemptPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; id: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, id: assessmentId } = await params;

  let attempt;
  let redirectUrl;
  try {
    attempt = await startAttempt(collegeSlug, assessmentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[assessment-attempt] startAttempt failed', { assessmentId, error: msg });
    redirectUrl = `/c/${collegeSlug}/student/assessments?error=attempt`;
  }
  if (redirectUrl) redirect(redirectUrl);

  if (!attempt) redirect(`/c/${collegeSlug}/student/assessments?error=attempt`);

  const state = await getAttemptState(collegeSlug, attempt.id);
  if (!state) redirect(`/c/${collegeSlug}/student/assessments`);

  return <AttemptClient initialState={state} collegeSlug={collegeSlug} />;
}
