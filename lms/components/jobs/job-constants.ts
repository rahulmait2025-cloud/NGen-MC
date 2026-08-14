export const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Remote',
  onsite: 'On-site',
  hybrid: 'Hybrid',
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  internship: 'Internship',
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
};

export const APPLICATION_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' }
> = {
  applied: { label: 'Applied', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'warning' },
  shortlisted: { label: 'Shortlisted', variant: 'success' },
  assessment: { label: 'Assessment', variant: 'default' },
  interview: { label: 'Interview', variant: 'default' },
  selected: { label: 'Selected', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  on_hold: { label: 'On Hold', variant: 'warning' },
  withdrawn: { label: 'Withdrawn', variant: 'secondary' },
};

/** Semantic color classes for work mode badges — shared across table and detail page */
export const WORK_MODE_COLORS: Record<string, string> = {
  remote: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  hybrid: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  onsite: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
};

/** Semantic color classes for employment type badges — shared across table and detail page */
export const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
  internship: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  full_time: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  part_time: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  contract: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
};

/** Semantic color classes for list section categories on the detail page */
export const LIST_SECTION_COLORS: Record<string, { iconBg: string; iconText: string; bulletText: string }> = {
  responsibilities: {
    iconBg: 'bg-emerald-500/8 dark:bg-emerald-500/12',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    bulletText: 'text-emerald-500/60 dark:text-emerald-400/60',
  },
  requirements: {
    iconBg: 'bg-amber-500/8 dark:bg-amber-500/12',
    iconText: 'text-amber-600 dark:text-amber-400',
    bulletText: 'text-amber-500/60 dark:text-amber-400/60',
  },
  skills: {
    iconBg: 'bg-violet-500/8 dark:bg-violet-500/12',
    iconText: 'text-violet-600 dark:text-violet-400',
    bulletText: 'text-violet-500/60 dark:text-violet-400/60',
  },
  perks: {
    iconBg: 'bg-rose-500/8 dark:bg-rose-500/12',
    iconText: 'text-rose-600 dark:text-rose-400',
    bulletText: 'text-rose-500/60 dark:text-rose-400/60',
  },
};
