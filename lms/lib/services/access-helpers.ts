import 'server-only';

export function isEntitlementActive(entitlement: {
  status?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
}): boolean {
  if (entitlement.status !== 'active') return false;
  const now = new Date();
  if (entitlement.valid_from && new Date(entitlement.valid_from) > now) return false;
  if (entitlement.valid_until && new Date(entitlement.valid_until) <= now) return false;
  return true;
}

export function isAssignmentActive(assignment: {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}): boolean {
  if (assignment.status !== 'active') return false;
  const now = new Date();
  if (assignment.start_date && new Date(assignment.start_date) > now) return false;
  if (assignment.end_date && new Date(assignment.end_date) <= now) return false;
  return true;
}

function _isEntitlementExpired(entitlement: {
  status?: string | null;
  valid_until?: string | null;
}): boolean {
  if (entitlement.status === 'revoked' || entitlement.status === 'expired') return true;
  if (entitlement.valid_until && new Date(entitlement.valid_until) <= new Date()) return true;
  return false;
}

/**
 * Returns the number of days remaining until the entitlement expires.
 * Returns null if there is no expiry (valid_until is null/undefined).
 * Returns 0 if already expired.
 */
export function getDaysUntilExpiry(entitlement: {
  valid_until?: string | null;
}): number | null {
  if (!entitlement.valid_until) return null;
  const now = new Date();
  const expiry = new Date(entitlement.valid_until);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
