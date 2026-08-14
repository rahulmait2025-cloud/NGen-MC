'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { retryFolderCreationAction } from './actions';

export function CreateFolderButton({
  courseId,
  className,
}: {
  courseId: string;
  className?: string;
}) {
  const { refresh } = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('master_course_id', courseId);

      const result = await retryFolderCreationAction(formData);

      if (!result.ok) {
        toast.error(result.error || 'Failed to create TPStreams folder');
        return;
      }

      toast.success('TPStreams folder created successfully');
      refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="default"
      onClick={handleCreate}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : (
        <FolderPlus className="size-4 mr-2" />
      )}
      {isPending ? 'Creating Folder...' : 'Create TPStreams Folder'}
    </Button>
  );
}
