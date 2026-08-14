/**
 * LMS Student Portal — Page metadata.
 *
 * Lightweight title/subtitle map for the student header bar.
 * Keeps student UX simpler than admin UX while maintaining consistency.
 */

export type LmsPageId =
    | 'dashboard'
    | 'explore'
    | 'progress'
    | 'courses'
    | 'pillars'
    | 'mentorship'
    | 'analytics'
    | 'activity'
    | 'profile'
    | 'learn'
    | 'payment-history'
    | 'jobs'
    | 'my-applications'
    | 'sheets'
    | 'my-courses'
    | 'campus-ambassador'
    | 'notes'
    | 'stats';

export const lmsPageMeta: Record<LmsPageId, { title: string; subtitle: string }> = {
    explore: {
        title: 'Explore',
        subtitle: 'Premium landing and course discovery.',
    },
    dashboard: {
        title: 'Dashboard',
        subtitle: 'Your learning overview and course activity.',
    },
    learn: {
        title: '',
        subtitle: '',
    },
    progress: {
        title: 'My Progress',
        subtitle: 'Track your learning activity and course progress.',
    },
    courses: {
        title: 'Courses',
        subtitle: 'Discover bootcamps, paid programs, and free content.',
    },
    pillars: {
        title: 'Pillars',
        subtitle: 'Core competency tracks and assessments.',
    },
    mentorship: {
        title: 'Mentorship',
        subtitle: 'Connect with mentors and track sessions.',
    },
    analytics: {
        title: 'Your learning dashboard',
        subtitle: 'Track your progress, streaks, and study patterns across all enrolled courses.',
    },
    activity: {
        title: 'Activity',
        subtitle: 'Recent learning events and milestones.',
    },
    profile: {
        title: 'Profile',
        subtitle: 'Manage your personal information and settings.',
    },
    'payment-history': {
        title: 'Payment History',
        subtitle: 'Your transactions and payment records.',
    },
    jobs: {
        title: 'Jobs',
        subtitle: 'Browse and apply to open job postings.',
    },
    'my-applications': {
        title: 'My Applications',
        subtitle: 'Track the status of your job applications.',
    },
    'sheets': {
        title: 'Sheet-Styled Courses',
        subtitle: 'Practice Structured Patterns to crack product',
    },
    'my-courses': {
        title: 'My Courses',
        subtitle: 'Your enrolled courses and learning progress.',
    },
    'campus-ambassador': {
        title: 'Campus Ambassador',
        subtitle: 'Track referrals, milestones, and earnings.',
    },
    notes: {
        title: 'Notes Library',
        subtitle: 'Handwritten and scanned notes for your courses.',
    },
    stats: {
        title: 'Code Pulse',
        subtitle: 'Coding & platform activity across GitHub, LeetCode, and more.',
    },
};

/**
 * Pre-built lookup table for pathname → LmsPageId mapping.
 * Checked in priority order (most specific first).
 */
const PATHWAY_RULES: Array<{ test: (p: string) => boolean; id: LmsPageId }> = [
  { test: (p) => p === '/' || p.endsWith('/student') || p.endsWith('/student/'), id: 'explore' },
  { test: (p) => p.includes('/my-courses'), id: 'my-courses' },
  { test: (p) => p.includes('/learn'), id: 'learn' },
  { test: (p) => p.includes('/courses') || p.includes('/free-courses') || p.includes('/paid-courses'), id: 'courses' },
  { test: (p) => p.includes('/sheets'), id: 'sheets' },
  { test: (p) => /\/student\/pillars\/[^/]+/.test(p), id: 'pillars' },
  { test: (p) => p.includes('/notes'), id: 'notes' },
  { test: (p) => p.includes('/mentorship'), id: 'mentorship' },
  { test: (p) => p.includes('/progress'), id: 'progress' },
  { test: (p) => p.includes('/analytics'), id: 'analytics' },
  { test: (p) => p.includes('/activity'), id: 'activity' },
  { test: (p) => p.includes('/payment-history'), id: 'payment-history' },
  { test: (p) => p.includes('/jobs'), id: 'jobs' },
  { test: (p) => p.includes('/my-applications'), id: 'my-applications' },
  { test: (p) => p.includes('/profile'), id: 'profile' },
  { test: (p) => p.includes('/campus-ambassador'), id: 'campus-ambassador' },
  { test: (p) => p.includes('/stats'), id: 'stats' },
  { test: (p) => p === '/dashboard' || p.includes('/dashboard'), id: 'dashboard' },
];

/**
 * Extract LmsPageId from pathname using priority-ordered rule matching.
 */
export function getLmsPageIdFromPath(pathname: string): LmsPageId {
  for (const rule of PATHWAY_RULES) {
    if (rule.test(pathname)) return rule.id;
  }
  return 'dashboard';
}
