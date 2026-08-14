'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { retryPillarFolderSyncAction } from '@/app/(app)/master-courses/actions';

interface RetryPillarSyncButtonProps extends React.ComponentProps<typeof Button> {
  pillarId: string;
}

export function RetryPillarSyncButton({
  pillarId,
  className,
  variant = 'outline',
  ...props
}: RetryPillarSyncButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRetry() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('pillar_id', pillarId);

      try {
        const result = await retryPillarFolderSyncAction(formData);

        if (result.ok) {
          toast.success('Pillar folder synced successfully');
          router.refresh();
        } else {
          toast.error(result.error ?? 'Failed to sync pillar folder');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      disabled={isPending}
      onClick={handleRetry}
      {...props}
    >
      {isPending ? (
        <Loader2 className="mr-2 size-3 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 size-3" />
      )}
      Retry Sync
    </Button>
  );
}
