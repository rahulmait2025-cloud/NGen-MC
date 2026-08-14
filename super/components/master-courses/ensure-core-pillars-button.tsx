'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ensureCorePillarsAction } from '@/app/(app)/master-courses/actions';

export function EnsureCorePillarsButton() {
  const [isPending, startTransition] = useTransition();
  const { refresh } = useRouter();

  function handleEnsurePillars() {
    startTransition(async () => {
      try {
        const result = await ensureCorePillarsAction();
        if (result.ok && result.data) {
          const { created, existed, failedSync } = result.data;
          if (created > 0) {
            toast.success(`Created ${created} core pillar(s). ${existed} already existed.`);
            if (failedSync > 0) {
              toast.warning(`${failedSync} pillar(s) failed TPStreams sync. You can retry from the menu.`);
            }
          } else {
            toast.info(`All ${existed} core pillars already exist.`);
          }
          refresh();
        } else {
          toast.error(result.error ?? 'Failed to create core pillars');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleEnsurePillars}
      disabled={isPending}
      className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-[background-color,color,transform] duration-160 active:scale-[0.98] shadow-sm"
    >
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <PlusCircle className="mr-2 size-4" />
      )}
      Create Core Pillars
    </Button>
  );
}
