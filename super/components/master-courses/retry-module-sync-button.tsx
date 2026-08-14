'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { retryModuleFolderSyncAction } from '@/app/(app)/master-courses/actions';
import { retryBootcampModuleFolderSyncAction } from '@/app/(app)/bootcamps/actions';

interface RetryModuleSyncButtonProps {
  context?: 'pillar' | 'bootcamp';
  /** Required when context='pillar'. */
  pillarId?: string;
  /** Required when context='bootcamp'. */
  bootcampId?: string;
  courseId: string;
  moduleId: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function RetryModuleSyncButton({
  context = 'pillar',
  pillarId,
  bootcampId,
  courseId,
  moduleId,
  className,
  size = 'sm',
  variant = 'outline',
}: RetryModuleSyncButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const { refresh } = useRouter();

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
      setLastResult(null);

      const formData = new FormData();
      formData.append('course_id', courseId);
      formData.append('module_id', moduleId);
      if (context === 'bootcamp') {
        formData.append('bootcamp_id', bootcampId!);
      } else {
        formData.append('pillar_id', pillarId!);
      }

      try {
        const result =
          context === 'bootcamp'
            ? await retryBootcampModuleFolderSyncAction(formData)
            : await retryModuleFolderSyncAction(formData);

        if (result.ok) {
          setLastResult({ ok: true });
          toast.success('Module folder synced successfully');
          refresh();
        } else {
          setLastResult({ ok: false, error: result.error });
          toast.error(result.error ?? 'Failed to sync module folder');
        }
      } catch {
        setLastResult({ ok: false, error: 'An unexpected error occurred' });
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleRetry}
        disabled={isPending}
        className={className}
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 size-4" />
        )}
        Retry Sync
      </Button>
      {lastResult &&
        (lastResult.ok ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <AlertCircle className="size-4 text-destructive" />
        ))}
    </div>
  );
}
