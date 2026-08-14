'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { retryCourseFolderSyncAction } from '@/app/(app)/master-courses/actions';
import { retryBootcampCourseFolderSyncAction } from '@/app/(app)/bootcamps/actions';

interface RetryCourseSyncButtonProps extends React.ComponentProps<typeof Button> {
  context?: 'pillar' | 'bootcamp';
  /** Required when context='pillar'. */
  pillarId?: string;
  /** Required when context='bootcamp'. */
  bootcampId?: string;
  courseId: string;
}

export function RetryCourseSyncButton({
  context = 'pillar',
  pillarId,
  bootcampId,
  courseId,
  className,
  variant = 'outline',
  ...props
}: RetryCourseSyncButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRetry() {
    if (context === 'bootcamp' && !bootcampId) {
      toast.error('Bootcamp ID is required');
      return;
    }
    if (context === 'pillar' && !pillarId) {
      toast.error('Pillar ID is required');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('course_id', courseId);
      if (context === 'bootcamp') {
        formData.append('bootcamp_id', bootcampId!);
      } else {
        formData.append('pillar_id', pillarId!);
      }

      try {
        const result =
          context === 'bootcamp'
            ? await retryBootcampCourseFolderSyncAction(formData)
            : await retryCourseFolderSyncAction(formData);

        if (result.ok) {
          toast.success('Course folder synced successfully');
          router.refresh();
        } else {
          toast.error(result.error ?? 'Failed to sync course folder');
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
