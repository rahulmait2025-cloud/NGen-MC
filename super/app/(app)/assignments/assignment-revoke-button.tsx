'use client';

import { useRouter } from 'next/navigation';
import { DestructiveConfirmDialog } from '@/components/master-courses/destructive-confirm-dialog';
import { Button } from '@/components/ui/button';
import { revokeAssignmentAction } from './actions';

interface AssignmentRevokeButtonProps {
  assignmentId: string;
  collegeId?: string;
  disabled?: boolean;
  buttonLabel?: string;
}

export function AssignmentRevokeButton({ assignmentId, collegeId, disabled = false, buttonLabel = 'Remove' }: AssignmentRevokeButtonProps) {
  const { refresh } = useRouter();

  return (
    <DestructiveConfirmDialog
      title="Remove this assignment?"
      description="This will remove the assignment and revoke access granted by this assignment. Catalog content will not be deleted."
      confirmLabel="Remove Assignment"
      pendingLabel="Removing assignment..."
      renderTrigger={(openDialog, pending) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={openDialog}
          disabled={disabled || pending}
        >
          {buttonLabel}
        </Button>
      )}
      onConfirm={async () => {
        const result = await revokeAssignmentAction(assignmentId, collegeId);
        if (!result.success) {
          return { ok: false, error: result.error ?? 'Failed to remove assignment.' };
        }

        refresh();
        const revokedCount = result.data?.entitlementsRevoked ?? 0;
        return {
          ok: true,
          message:
            revokedCount > 0
              ? `Assignment removed. ${revokedCount} entitlements revoked.`
              : 'Assignment removed. No entitlements were revoked.',
        };
      }}
    />
  );
}
