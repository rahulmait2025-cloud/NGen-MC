export const MENTORSHIP_AUDIENCE_TARGET_TYPES = [
  'all_bootcamp_enrolled',
  'college',
  'student',
  'course',
  'bundle',
  'paid_course',
  'master_course',
  'product',
] as const;

export type MentorshipAudienceTargetType = typeof MENTORSHIP_AUDIENCE_TARGET_TYPES[number];

export interface MentorshipAudienceTargetInput {
  targetType: MentorshipAudienceTargetType;
  targetId?: string | null;
}

export interface ResolvedMentorshipRecipient {
  studentId: string;
  collegeId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  email: string;
  fullName: string;
  firstName: string;
  authUserId: string;
  collegeName: string | null;
}

export interface MentorshipRecipientPreview {
  totalCount: number;
  preview: Array<{
    studentId: string;
    fullName: string;
    email: string;
    collegeName: string | null;
    sourceType: string | null;
  }>;
  countsByTargetType: Record<string, number>;
  zeroReason?: string;
}
