'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { updatePillarAction } from '@/app/(app)/master-courses/actions';

interface PublishPillarButtonProps {
  pillarId: string;
}

export function PublishPillarButton({ pillarId }: PublishPillarButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { refresh } = useRouter();

  function handlePublish() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('pillar_id', pillarId);
        formData.append('publish_status', 'published');

        const result = await updatePillarAction(formData);
        if (result.ok) {
          toast.success('Pillar published successfully');
          refresh();
        } else {
          toast.error(result.error ?? 'Failed to publish pillar');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <Button
      variant='default'
      size='sm'
      className='gap-1.5'
      disabled={isPending}
      onClick={handlePublish}
    >
      {isPending ? (
        <Loader2 className='size-3.5 animate-spin' />
      ) : (
        <Globe className='size-3.5' />
      )}
      Publish Pillar
    </Button>
  );
}
