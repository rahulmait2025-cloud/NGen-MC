import 'server-only';
import { headers } from 'next/headers';
import { isValidUuid } from './identity';

export type VerifiedStudentClaimTuple = {
  userId: string;
  studentId: string;
  membershipId: string;
  collegeId: string;
  claimCollegeSlug: string;
  role: 'student';
};

export function normalizeCollegeSlug(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Reads and strictly validates the student claim tuple from internal headers.
 * Returns null if any field is missing, malformed, or if the role is not strictly student.
 */
export async function getVerifiedStudentClaimTuple(): Promise<VerifiedStudentClaimTuple | null> {
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const studentId = headerStore.get('x-student-id');
  const membershipId = headerStore.get('x-membership-id');
  const collegeId = headerStore.get('x-college-id');
  const claimCollegeSlug = headerStore.get('x-claim-college-slug');
  const collegeRole = headerStore.get('x-college-role');
  const globalRole = headerStore.get('x-global-role');

  // Strictly verify roles. Reject admin / superadmin bypasses on the student fast path.
  if (collegeRole !== 'student') {
    return null;
  }
  if (
    globalRole === 'superadmin' ||
    globalRole === 'college-admin' ||
    globalRole === 'global-admin'
  ) {
    return null;
  }

  // Strictly check formatting and UUIDs
  if (
    !userId || !isValidUuid(userId) ||
    !studentId || !isValidUuid(studentId) ||
    !membershipId || !isValidUuid(membershipId) ||
    !collegeId || !isValidUuid(collegeId) ||
    !claimCollegeSlug || typeof claimCollegeSlug !== 'string' || claimCollegeSlug.trim() === ''
  ) {
    return null;
  }

  return {
    userId,
    studentId,
    membershipId,
    collegeId,
    claimCollegeSlug: normalizeCollegeSlug(claimCollegeSlug),
    role: 'student',
  };
}
