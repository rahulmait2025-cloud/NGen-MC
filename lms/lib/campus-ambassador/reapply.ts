/**
 * Pure decision helpers for Campus Ambassador reapplication after removal.
 * Kept dependency-free so unit tests can cover the lifecycle without DB access.
 */

export type CampusAmbassadorSubmitOutcome =
  | 'already_ambassador'
  | 'already_pending'
  | 'reapply'
  | 'create';

export function resolveCampusAmbassadorSubmitOutcome(input: {
  ambassadorStatus: string | null | undefined;
  accessEnabled: boolean | null | undefined;
  applicationStatus: string | null | undefined;
}): CampusAmbassadorSubmitOutcome {
  const ambassadorActive =
    (input.ambassadorStatus === 'active' || input.ambassadorStatus === 'paused') &&
    Boolean(input.accessEnabled);

  if (ambassadorActive) {
    return 'already_ambassador';
  }

  if (input.applicationStatus === 'submitted') {
    return 'already_pending';
  }

  // Approved application with no active ambassador (removed / missing) can reapply
  // by resetting that application row to submitted.
  if (input.applicationStatus === 'approved' || input.applicationStatus === 'rejected') {
    return 'reapply';
  }

  return 'create';
}

export function isActiveCampusAmbassador(input: {
  status: string | null | undefined;
  accessEnabled: boolean | null | undefined;
}): boolean {
  return (
    (input.status === 'active' || input.status === 'paused') && Boolean(input.accessEnabled)
  );
}
