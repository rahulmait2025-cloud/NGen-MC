import 'server-only';

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
