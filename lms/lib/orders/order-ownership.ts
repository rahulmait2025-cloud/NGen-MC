/**
 * Order purchaser_user_id may be auth.users.id (correct) or legacy students.id.
 */
export function orderBelongsToAuthenticatedStudent(
  order: {
    purchaser_user_id: string | null;
    metadata?: Record<string, unknown> | null;
  },
  ctx: { user: { id: string }; studentId: string },
): boolean {
  const purchaserRef = order.purchaser_user_id?.trim();
  if (!purchaserRef) return false;
  if (purchaserRef === ctx.user.id) return true;
  if (purchaserRef === ctx.studentId) return true;
  const metaStudentId = order.metadata?.student_id;
  if (typeof metaStudentId === 'string' && metaStudentId === ctx.studentId) return true;
  return false;
}
