'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type TpFolderSyncResult = {
  active_asset_count: number;
  inserted: number;
  updated: number;
  removed: number;
  skipped?: number;
};

type SyncFolderAction = (
  formData: FormData,
) => Promise<{ ok: boolean; data?: TpFolderSyncResult; error?: string }>;

interface SyncCourseFolderButtonProps {
  courseId: string;
  action: SyncFolderAction;
  disabled?: boolean;
  className?: string;
}

export function SyncCourseFolderButton({
  courseId,
  action,
  disabled,
  className,
}: SyncCourseFolderButtonProps) {
  const { refresh } = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('master_course_id', courseId);

      const result = await action(formData);

      if (!result.ok || !result.data) {
        toast.error(result.error || 'Failed to sync TPStreams folder');
        return;
      }

      const skippedSuffix =
        result.data.skipped && result.data.skipped > 0
          ? `, ${result.data.skipped} skipped`
          : '';
      toast.success(
        `Sync complete: ${result.data.active_asset_count} active, ${result.data.inserted} added, ${result.data.updated} updated, ${result.data.removed} removed${skippedSuffix}.`,
      );
      refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSync}
      disabled={disabled || isPending}
      className={className}
    >
      <RefreshCw className={`size-4 mr-2${isPending ? ' animate-spin' : ''}`} />
      {isPending ? 'Syncing...' : 'Sync from TPStreams'}
    </Button>
  );
}
