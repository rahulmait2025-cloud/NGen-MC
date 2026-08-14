import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { getVerifiedIdentity, isValidUuid } from './identity';
import { getVerifiedStudentClaimTuple, normalizeCollegeSlug } from './claims';
import {
  resolveStudentAuthContextDb,
  resolveStudentAuthContextCached,
  type StudentResolverRow,
} from './authorization';
import { logDiagnostic, redactId } from './diagnostics';
import { StudentRuntimeError } from './errors';
import type { StudentRuntime, StudentRuntimeOptions, StudentTenantKind } from './types';
import { verifySensitiveSession } from './sensitive-session';

const DIRECT_LEARNER_SLUGS = new Set(['direct-learners', 'direct-learner']);

export function isDirectLearnerSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return DIRECT_LEARNER_SLUGS.has(slug.toLowerCase().trim());
}

/**
 * Request-memoized internal resolver to prevent duplicate lookups within a single request context.
 * Kept request-local by React cache().
 */
const resolveStudentRuntimeMemoized = cache(
  async (
    userId: string,
    routeCollegeSlug: string,
    freshness: 'cached' | 'fresh',
    assurance: 'standard' | 'sensitive',
    fallbackOnIncomplete: boolean
  ): Promise<StudentRuntime | null> => {
    const normalizedRouteSlug = normalizeCollegeSlug(routeCollegeSlug);
    const reqIsDirect = isDirectLearnerSlug(normalizedRouteSlug);

    // 0. Sensitive Flow Check
    if (assurance === 'sensitive') {
      // Step 2 & 3: Validate session and confirm Auth user matches expectation
      const verifiedSession = await verifySensitiveSession(userId);

      // Step 4: Resolve tenant authorization using the fresh authoritative database client (no persistent cache)
      logDiagnostic(`sensitive-authorization-rpc: userId=${redactId(verifiedSession.userId)}, collegeSlug=${normalizedRouteSlug}`);
      const row = await resolveStudentAuthContextDb(verifiedSession.userId, normalizedRouteSlug);

      if (!row || !row.allowed || row.profile_is_active === false) {
        logDiagnostic(`sensitive-authorization-denied: userId=${redactId(verifiedSession.userId)}, collegeSlug=${normalizedRouteSlug}`);
        throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Sensitive authorization failed.');
      }

      // Step 5: Confirm authoritative database row belongs to the expected user
      if (row.user_id !== verifiedSession.userId) {
        logDiagnostic(`sensitive-authorization-denied: User mismatch on resolved database row.`);
        throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Sensitive authorization failed.');
      }

      // Verify database identifiers formatting and UUIDs
      if (
        !isValidUuid(row.user_id) ||
        !isValidUuid(row.student_id) ||
        !isValidUuid(row.membership_id) ||
        !isValidUuid(row.college_id)
      ) {
        logDiagnostic(`sensitive-authorization-denied: Database row has malformed or missing required identifiers.`);
        throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Sensitive authorization failed.');
      }

      // For college students, require the authoritative resolver to return the college slug
      if (!reqIsDirect && !row.college_slug) {
        logDiagnostic(`sensitive-authorization-denied: Authoritative fallback missing college slug for college tenant.`);
        throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Sensitive authorization failed.');
      }

      const resolvedSlug = reqIsDirect ? 'direct-learners' : normalizeCollegeSlug(row.college_slug!);
      const isDirect = isDirectLearnerSlug(resolvedSlug);

      return {
        identity: {
          userId: row.user_id,
          email: row.profile_email,
          fullName: row.profile_full_name,
        },
        student: {
          studentId: row.student_id,
          membershipId: row.membership_id,
          membershipStatus: row.membership_status,
        },
        tenant: {
          kind: (isDirect ? 'direct' : 'college') as StudentTenantKind,
          collegeId: row.college_id,
          routeSlug: reqIsDirect ? 'direct-learners' : normalizedRouteSlug,
          claimSlug: null,
          resolvedSlug: resolvedSlug,
          isGlobal: isDirect,
        },
        auth: {
          source: 'sensitive-auth-user-and-rpc',
          freshness: 'fresh',
          assurance: 'sensitive',
        },
      };
    }

    // 1. Standard Claims Fast-Path
    const tuple = await getVerifiedStudentClaimTuple();
    if (tuple) {
      // Validate that the claim tuple belongs to the verified user
      if (tuple.userId !== userId) {
        logDiagnostic(`claims-tenant-mismatch: User mismatch between claim tuple and verified identity.`);
        return null;
      }

      // Check for valid formatting/UUIDs in the claim tuple
      if (
        !isValidUuid(tuple.userId) ||
        !isValidUuid(tuple.studentId) ||
        !isValidUuid(tuple.membershipId) ||
        !isValidUuid(tuple.collegeId)
      ) {
        logDiagnostic(`claims-incomplete: Malformed claim tuple identifiers.`);
        return null;
      }

      const claimSlug = tuple.claimCollegeSlug;
      const claimIsDirect = isDirectLearnerSlug(claimSlug);

      if ((reqIsDirect && claimIsDirect) || (normalizedRouteSlug === claimSlug)) {
        logDiagnostic(`claims-fast-path: userId=${redactId(tuple.userId)}, collegeSlug=${normalizedRouteSlug}`);
        const headerStore = await headers();
        const userEmail = headerStore.get('x-user-email') || null;
        
        return {
          identity: {
            userId: tuple.userId,
            email: userEmail,
            fullName: headerStore.get('x-user-fullname') || null,
          },
          student: {
            studentId: tuple.studentId,
            membershipId: tuple.membershipId,
            membershipStatus: 'active',
          },
          tenant: {
            kind: reqIsDirect ? 'direct' : 'college',
            collegeId: tuple.collegeId,
            routeSlug: reqIsDirect ? 'direct-learners' : normalizedRouteSlug,
            claimSlug: claimSlug,
            resolvedSlug: null,
            isGlobal: reqIsDirect,
          },
          auth: {
            source: 'claims-fast-path',
            freshness,
            assurance: 'standard',
          },
        };
      } else {
        logDiagnostic(`claims-tenant-mismatch: userId=${redactId(tuple.userId)}, claimCollegeSlug=${claimSlug}, routeCollegeSlug=${normalizedRouteSlug}`);
      }
    } else {
      logDiagnostic(`claims-incomplete: userId=${redactId(userId)}, requestedCollegeSlug=${normalizedRouteSlug}`);
    }

    // If claims are incomplete or mismatched, and we shouldn't fallback on public pages, exit early.
    if (!fallbackOnIncomplete) {
      return null;
    }

    // 2. Standard Authoritative Fallback (DB/RPC Lookup)
    logDiagnostic(`authorization-fallback-requested: userId=${redactId(userId)}, collegeSlug=${normalizedRouteSlug}`);

    let row: StudentResolverRow | null = null;
    if (freshness === 'fresh') {
      row = await resolveStudentAuthContextDb(userId, normalizedRouteSlug);
    } else {
      row = await resolveStudentAuthContextCached(userId, normalizedRouteSlug);
    }

    if (!row || !row.allowed || row.profile_is_active === false) {
      logDiagnostic(`fallback-denied: userId=${redactId(userId)}, collegeSlug=${normalizedRouteSlug}`);
      return null;
    }

    // Confirm that the returned database row belongs to the verified user
    if (row.user_id !== userId) {
      logDiagnostic(`fallback-denied: User mismatch on resolved database row.`);
      return null;
    }

    // Verify database identifiers formatting and UUIDs
    if (
      !isValidUuid(row.user_id) ||
      !isValidUuid(row.student_id) ||
      !isValidUuid(row.membership_id) ||
      !isValidUuid(row.college_id)
    ) {
      logDiagnostic(`fallback-denied: Database row has malformed or missing required identifiers.`);
      return null;
    }

    // For college students, require the authoritative resolver to return the college slug
    if (!reqIsDirect && !row.college_slug) {
      logDiagnostic(`fallback-denied: Authoritative fallback missing college slug for college tenant.`);
      return null;
    }

    const resolvedSlug = reqIsDirect ? 'direct-learners' : normalizeCollegeSlug(row.college_slug!);
    const isDirect = isDirectLearnerSlug(resolvedSlug);

    logDiagnostic(`authorization-fallback-resolved: userId=${redactId(row.user_id)}, collegeSlug=${resolvedSlug}`);

    return {
      identity: {
        userId: row.user_id,
        email: row.profile_email,
        fullName: row.profile_full_name,
      },
      student: {
        studentId: row.student_id,
        membershipId: row.membership_id,
        membershipStatus: row.membership_status,
      },
      tenant: {
        kind: (isDirect ? 'direct' : 'college') as StudentTenantKind,
        collegeId: row.college_id,
        routeSlug: reqIsDirect ? 'direct-learners' : normalizedRouteSlug,
        claimSlug: null, // A database-resolved slug must not be presented as a JWT claim
        resolvedSlug: resolvedSlug,
        isGlobal: isDirect,
      },
      auth: {
        source: freshness === 'fresh' ? 'authorization-rpc' : 'authorization-cache',
        freshness,
        assurance: 'standard',
      },
    };
  }
);

/**
 * Public resolver to fetch optional Student Runtime.
 * Returns null if not authenticated or not authorized.
 * Never redirects or throws on public routes.
 */
export async function getOptionalStudentRuntime(
  routeCollegeSlug?: string | null,
  options?: StudentRuntimeOptions & { fallbackOnIncomplete?: boolean }
): Promise<StudentRuntime | null> {
  const identity = await getVerifiedIdentity();
  if (!identity) {
    return null;
  }

  // When no route tenant is supplied, return null for tenant-aware optional runtime.
  if (!routeCollegeSlug) {
    return null;
  }

  const freshness = options?.freshness || 'cached';
  const assurance = options?.assurance || 'standard';

  // Optional sensitive assurance is rejected
  if (assurance === 'sensitive') {
    throw new StudentRuntimeError(400, 'FORBIDDEN', 'Optional sensitive assurance is not supported.');
  }

  // Default to false for optional runtime to avoid redundant DB queries on public routes
  const fallbackOnIncomplete = options?.fallbackOnIncomplete ?? false;

  return resolveStudentRuntimeMemoized(
    identity.userId,
    routeCollegeSlug,
    freshness,
    assurance,
    fallbackOnIncomplete
  );
}

/**
 * Public resolver to require Student Runtime.
 * Throws a StudentRuntimeError if authentication or authorization fails.
 */
export async function requireStudentRuntime(
  routeCollegeSlug: string,
  options?: StudentRuntimeOptions
): Promise<StudentRuntime> {
  const identity = await getVerifiedIdentity();
  if (!identity) {
    throw new StudentRuntimeError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }

  const freshness = options?.freshness || 'cached';
  const assurance = options?.assurance || 'standard';

  const runtime = await resolveStudentRuntimeMemoized(
    identity.userId,
    routeCollegeSlug,
    freshness,
    assurance,
    true // Always fallback to DB for protected routes
  );

  if (!runtime) {
    throw new StudentRuntimeError(403, 'FORBIDDEN', 'Access denied.');
  }

  return runtime;
}

/**
 * Require Student Runtime for Server Actions.
 */
export async function requireStudentRuntimeForAction(
  routeCollegeSlug: string,
  options?: StudentRuntimeOptions
): Promise<StudentRuntime> {
  return requireStudentRuntime(routeCollegeSlug, options);
}

/**
 * Convenience wrapper for requiring sensitive student runtime assurance.
 */
export async function requireSensitiveStudentRuntime(
  routeCollegeSlug: string
): Promise<StudentRuntime> {
  return requireStudentRuntime(routeCollegeSlug, {
    assurance: 'sensitive',
    freshness: 'fresh',
  });
}

/**
 * Require Student Runtime backed strictly by verified local JWT claims (no DB/RPC fallback).
 * Used by private resource routes to ensure 0 Auth-server getUser calls and 0 auth RPC calls.
 */
export async function requireClaimBackedStudentRuntime(
  routeCollegeSlug: string
): Promise<StudentRuntime> {
  const identity = await getVerifiedIdentity();
  if (!identity) {
    throw new StudentRuntimeError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }

  const runtime = await resolveStudentRuntimeMemoized(
    identity.userId,
    routeCollegeSlug,
    'cached',
    'standard',
    false // strictly false: no DB/RPC fallback for incomplete claims
  );

  if (!runtime || runtime.auth.source !== 'claims-fast-path') {
    throw new StudentRuntimeError(403, 'FORBIDDEN', 'Claims-backed student authentication required.');
  }

  return runtime;
}
