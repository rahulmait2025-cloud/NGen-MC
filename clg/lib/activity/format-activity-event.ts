const EVENT_LABELS: Record<string, string> = {
  login_success: 'Login successful',
  login_failure: 'Login failed',
  logout: 'Logged out',
  password_reset_requested: 'Password reset requested',
  password_reset_completed: 'Password reset completed',
  invite_sent: 'Invite sent',
  invite_accepted: 'Invite accepted',
  admin_created: 'Admin created',
  admin_deactivated: 'Admin deactivated',
  admin_reactivated: 'Admin reactivated',
  user_role_changed: 'User role changed',
  course_assigned: 'Course assigned',
  lecture_created: 'Lecture created',
  lecture_published: 'Lecture published',
  lecture_completed: 'Lecture completed',
  attendance_marked: 'Attendance marked',
  assessment_created: 'Assessment created',
  assessment_published: 'Assessment published',
  assessment_started: 'Assessment started',
  assessment_submitted: 'Assessment submitted',
  assessment_evaluated: 'Assessment evaluated',
  placement_profile_updated: 'Placement profile updated',
  placement_marked_ready: 'Marked placement ready',
  placement_verified: 'Placement verified',
  offer_uploaded: 'Offer uploaded',
  feature_flag_changed: 'Feature flag changed',
  notification_sent: 'Notification sent',
  notification_failed: 'Notification failed',
  notification_retried: 'Notification retried',
  job_started: 'Background job started',
  job_failed: 'Background job failed',
  job_completed: 'Background job completed',
  file_uploaded: 'File uploaded',
  profile_updated: 'Profile updated',
  suspicious_session_detected: 'Suspicious session detected',
  session_revoked: 'Session revoked',
  college_created: 'College created',
  college_updated: 'College updated',
  college_deleted: 'College deleted',
  student_invited: 'Student invited',
  student_updated: 'Student updated',
  student_deleted: 'Student deleted',
};

const METADATA_PRIORITY_KEYS = [
  'full_name',
  'name',
  'email',
  'student_email',
  'slug',
  'title',
  'course_title',
  'student_code',
  'role',
  'status',
  'college_name',
] as const;

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => {
      const formatted = formatValue(v);
      return formatted ? [formatted] : [];
    }).join(', ');
  }
  return JSON.stringify(value);
}

export function getActivityEventLabel(eventName: string): string {
  if (EVENT_LABELS[eventName]) {
    return EVENT_LABELS[eventName];
  }
  return humanizeKey(eventName);
}

export function getActivityEventSummary(
  eventName: string,
  metadata: Record<string, unknown>,
): string {
  const email = metadata.email ?? metadata.student_email;
  const name = metadata.full_name ?? metadata.name;

  switch (eventName) {
    case 'student_invited':
      if (name && email) {
        return `Invited ${name} (${email})`;
      }
      if (email) {
        return `Invited ${email}`;
      }
      if (name) {
        return `Invited ${name}`;
      }
      break;
    case 'college_created':
    case 'college_updated':
      if (metadata.name && metadata.slug) {
        return `${metadata.name} (${metadata.slug})`;
      }
      if (metadata.name) {
        return String(metadata.name);
      }
      break;
    case 'login_success':
    case 'login_failure':
      if (email) {
        return String(email);
      }
      break;
    case 'course_assigned':
      if (metadata.course_title && name) {
        return `${name} → ${metadata.course_title}`;
      }
      if (metadata.course_title) {
        return String(metadata.course_title);
      }
      break;
    case 'assessment_submitted':
    case 'assessment_evaluated':
      if (metadata.title) {
        return String(metadata.title);
      }
      break;
    default:
      break;
  }

  const parts: string[] = [];
  for (const key of METADATA_PRIORITY_KEYS) {
    const value = metadata[key];
    if (value != null && String(value).trim() !== '') {
      parts.push(formatValue(value));
    }
  }
  if (parts.length > 0) {
    return parts.join(' · ');
  }

  const entries = Object.entries(metadata).filter(
    ([, v]) => v != null && String(v).trim() !== '',
  );
  if (entries.length === 0) {
    return 'No additional details';
  }
  if (entries.length <= 3) {
    return entries.map(([k, v]) => `${humanizeKey(k)}: ${formatValue(v)}`).join(' · ');
  }
  return `${entries.length} fields recorded — expand for full details`;
}

export function getActivityMetadataEntries(
  metadata: Record<string, unknown>,
): { key: string; label: string; value: string }[] {
  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (value != null && String(value).trim() !== '') {
      acc.push({
        key,
        label: humanizeKey(key),
        value: formatValue(value),
      });
    }
    return acc;
  }, [] as { key: string; label: string; value: string }[]);
}

export function formatActivityRole(role: string | null): string {
  if (!role) {
    return 'Unknown';
  }
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) {
    return 'Unknown time';
  }
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) {
    return 'Just now';
  }
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const CATEGORY_STYLES: Record<
  string,
  { badge: string; dot: string }
> = {
  auth: { badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20', dot: 'bg-blue-500' },
  admin: { badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20', dot: 'bg-violet-500' },
  user: { badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20', dot: 'bg-slate-500' },
  course: { badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-500' },
  lecture: { badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20', dot: 'bg-teal-500' },
  attendance: { badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20', dot: 'bg-cyan-500' },
  assessment: { badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20', dot: 'bg-amber-500' },
  placement: { badge: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20', dot: 'bg-orange-500' },
  notification: { badge: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20', dot: 'bg-pink-500' },
  job: { badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20', dot: 'bg-zinc-500' },
  file: { badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20', dot: 'bg-indigo-500' },
  profile: { badge: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/20', dot: 'bg-fuchsia-500' },
  security: { badge: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20', dot: 'bg-red-500' },
  tenant: { badge: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary' },
  feature: { badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20', dot: 'bg-purple-500' },
};

export function getCategoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category] ?? {
      badge: 'bg-muted text-muted-foreground border-border',
      dot: 'bg-muted-foreground',
    }
  );
}
