import { isDirectLearnerCollegeSlug } from '@/lib/colleges/direct-learner-slug';
import {
  buildEmailHeaderDisplay,
  normalizeRecipientCollegeName,
} from './email-header-branding';

const CAREER_READINESS_PROGRAM_LAUNCH_SLUG = 'career-readiness-program-launch';

/** Student-facing Career Readiness templates: Google auth first name, audience college, header branch merge. */
const CAREER_READINESS_STUDENT_BRANCH_MERGE_SLUGS = new Set<string>([
  CAREER_READINESS_PROGRAM_LAUNCH_SLUG,
  'student-onboarding-career-readiness-roadmap',
  'technical-foundations-reminder',
  'ai-agentic-ai-module-announcement',
  'project-completion-nudge',
  'resume-github-linkedin-reminder',
  'mock-interview-invite',
  'founder-mentorship-session-invite',
  'certificate-eligibility-notice',
  'program-deadline-alert',
  'advanced-addons-teaser',
]);

const CAREER_READINESS_ADMIN_SHELL_SLUGS = new Set<string>([
  'college-admin-progress-report',
]);

export function usesCareerLaunchBranchMerge(slug: string | null | undefined): boolean {
  return Boolean(slug && CAREER_READINESS_STUDENT_BRANCH_MERGE_SLUGS.has(slug));
}

export function usesCareerEmailShellMerge(slug: string | null | undefined): boolean {
  return (
    usesCareerLaunchBranchMerge(slug) ||
    Boolean(slug && CAREER_READINESS_ADMIN_SHELL_SLUGS.has(slug))
  );
}

/** Launch shell header + Gmail preheader for student and college-admin templates. */
export function buildCareerEmailShellMerge(input: {
  slug: string;
  previewTextRaw: string | null | undefined;
  mergedVariables: Record<string, string>;
  programName: string;
  collegeName: string;
  collegeSlug: string | null | undefined;
}): Record<string, string> {
  if (usesCareerLaunchBranchMerge(input.slug)) {
    return buildCareerStudentEmailMerge(input);
  }

  const direct = isDirectLearnerCollegeSlug(input.collegeSlug);
  const previewResolved = resolveMergePlaceholders(
    input.previewTextRaw ?? '',
    input.mergedVariables,
  ).trim();

  return {
    email_header_display: direct
      ? 'NextGen CTO'
      : buildEmailHeaderDisplay(input.collegeName),
    email_preheader_text: previewResolved,
  };
}

function resolveMergePlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}

/** Launch: dynamic preheader + program lead. Other student templates: header + preview-text preheader (Gmail snippet). */
function buildCareerStudentEmailMerge(input: {
  slug: string;
  previewTextRaw: string | null | undefined;
  mergedVariables: Record<string, string>;
  programName: string;
  collegeName: string;
  collegeSlug: string | null | undefined;
}): Record<string, string> {
  if (input.slug === CAREER_READINESS_PROGRAM_LAUNCH_SLUG) {
    return buildCareerLaunchBranchMerge({
      programName: input.programName,
      collegeName: input.collegeName,
      collegeSlug: input.collegeSlug,
    });
  }

  const direct = isDirectLearnerCollegeSlug(input.collegeSlug);
  const previewResolved = resolveMergePlaceholders(
    input.previewTextRaw ?? '',
    input.mergedVariables,
  ).trim();

  return {
    email_header_display: direct
      ? 'NextGen CTO'
      : buildEmailHeaderDisplay(input.collegeName),
    email_preheader_text: previewResolved,
  };
}

function buildCareerLaunchBranchMerge(input: {
  programName: string;
  collegeName: string;
  collegeSlug: string | null | undefined;
}): Record<string, string> {
  const pn = (input.programName ?? '').trim() || 'Your Program';
  const cn = normalizeRecipientCollegeName(input.collegeName);
  const direct = isDirectLearnerCollegeSlug(input.collegeSlug);

  if (direct) {
    return {
      email_header_display: 'NextGen CTO',
      email_preheader_text:
        `Presenting ${pn} - a structured career readiness journey with foundations, projects, profiles, AI exposure, and interview readiness.`,
      email_program_lead_html:
        `Presenting <strong>${pn}</strong> — a structured career readiness journey designed to help you move from learning concepts to building real career assets.`,
      email_program_lead_text:
        `Presenting ${pn} - a structured career readiness journey designed to help you move from learning concepts to building real career assets.`,
    };
  }

  return {
    email_header_display: buildEmailHeaderDisplay(cn),
    email_preheader_text:
      `Your college has enabled access to ${pn} - build foundations, projects, profiles, AI exposure, and interview readiness.`,
    email_program_lead_html:
      `Your college has enabled access to <strong>${pn}</strong> - a structured career readiness journey designed to help you move from learning concepts to building real career assets.`,
    email_program_lead_text:
      `Your college has enabled access to ${pn} - a structured career readiness journey designed to help you move from learning concepts to building real career assets.`,
  };
}
