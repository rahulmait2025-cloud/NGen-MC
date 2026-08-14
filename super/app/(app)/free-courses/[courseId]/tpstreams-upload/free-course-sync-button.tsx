'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { syncFreeCourseTpAssetsAction } from './actions';

export function FreeCourseSyncButton({
  courseId,
  disabled,
}: {
  courseId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await syncFreeCourseTpAssetsAction(courseId);
          if (!result.ok) {
            toast.error(result.error || 'Failed to sync TPStreams folder');
            return;
          }
          if (!result.data) {
            toast.error('Sync completed but returned no folder data');
            return;
          }
          const skippedSuffix =
            result.data.skipped > 0 ? `, ${result.data.skipped} skipped` : '';
          toast.success(
            `Sync complete: ${result.data.active_asset_count} active, ${result.data.inserted} added, ${result.data.updated} updated, ${result.data.removed} removed${skippedSuffix}.`,
          );
          router.refresh();
        });
      }}
    >
      <RefreshCw className={`size-4 mr-2${isPending ? ' animate-spin' : ''}`} />
      {isPending ? 'Syncing...' : 'Sync from TPStreams'}
    </Button>
  );
}
