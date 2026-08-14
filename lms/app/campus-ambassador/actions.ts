'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import {
  getCampusAmbassadorPageState,
  getCampusAmbassadorPageStateForUser,
  getCampusAmbassadorReferralDetails,
  submitCampusAmbassadorApplicationForUser,
  type CampusAmbassadorPageState,
  type CampusAmbassadorReferralDetail,
  type SubmitCampusAmbassadorApplicationInput,
} from '@/lib/services/campus-ambassador';

export interface CampusAmbassadorActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function submitCampusAmbassadorApplicationAction(
  input: SubmitCampusAmbassadorApplicationInput,
): Promise<CampusAmbassadorActionResult<CampusAmbassadorPageState>> {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return { ok: false, error: 'Please sign in to apply for the Campus Ambassador program.' };
  }

  const userId = identity.userId;

  try {
    const { state, outcome } = await submitCampusAmbassadorApplicationForUser(userId, input);

    revalidatePath('/campus-ambassador');
    revalidatePath('/c/[collegeSlug]/student/dashboard/campus-ambassador', 'page');
    revalidateTag(`ambassador-status-${userId}`, 'max');

    if (outcome === 'already_ambassador') {
      return {
        ok: false,
        data: state,
        error: 'You are already an active Campus Ambassador.',
      };
    }

    if (outcome === 'already_pending') {
      return {
        ok: true,
        data: state,
        message: 'Your Campus Ambassador application is already pending review.',
      };
    }

    if (state.application?.status !== 'submitted') {
      return {
        ok: false,
        data: state,
        error: 'Application was not saved. Please try again.',
      };
    }

    return {
      ok: true,
      data: state,
      message: 'Your Campus Ambassador application has been submitted for review.',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit application.';
    if (process.env.NODE_ENV === 'development') {
      console.error('[Campus Ambassador] submit failed', { userId, message });
    }
    return { ok: false, error: message };
  }
}

export async function refreshCampusAmbassadorStateAction(): Promise<
  CampusAmbassadorActionResult<CampusAmbassadorPageState>
> {
  const identity = await getVerifiedIdentity();
  try {
    const data = identity?.userId
      ? await getCampusAmbassadorPageStateForUser(identity.userId)
      : await getCampusAmbassadorPageState();
    return { ok: true, data };
  } catch (error: unknown) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function getCampusAmbassadorReferralDetailsAction(): Promise<
  CampusAmbassadorActionResult<CampusAmbassadorReferralDetail[]>
> {
  const identity = await getVerifiedIdentity();

  if (!identity?.userId) {
    return { ok: false, error: 'Please sign in to view referral details.' };
  }

  try {
    const details = await getCampusAmbassadorReferralDetails(identity.userId);
    return { ok: true, data: details };
  } catch (error: unknown) {
    return { ok: false, error: (error as Error).message };
  }
}
