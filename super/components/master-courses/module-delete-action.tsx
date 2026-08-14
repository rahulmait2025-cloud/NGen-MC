import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { deleteModuleAction, getModuleDeleteImpactAction } from '@/app/(app)/master-courses/actions';
import { deleteBootcampModuleAction } from '@/app/(app)/bootcamps/actions';
import { DestructiveConfirmDialog } from '@/components/master-courses/destructive-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ModuleDeleteImpact } from '@/lib/services/master-course-delete';
import type { MasterCourseModulesRow } from '@/types/database';

interface ModuleDeleteActionProps {
  /** Pillar (default) or Bootcamp context. */
  context?: 'pillar' | 'bootcamp';
  /** Pillar parent (required when context='pillar'). */
  pillarId?: string;
  /** Bootcamp parent (required when context='bootcamp'). */
  bootcampId?: string;
  courseId: string;
  module: MasterCourseModulesRow;
  /**
   * Optional pre-fetched Pillar-context impact.
   * If not provided, it will be loaded dynamically on demand.
   */
  impact?: ModuleDeleteImpact;
  /** Bootcamp-context video count (when context='bootcamp'). */
  videoCount?: number;
}

export function ModuleDeleteAction({
  context = 'pillar',
  pillarId,
  bootcampId,
  courseId,
  module,
  impact,
  videoCount,
}: ModuleDeleteActionProps) {
  const { refresh } = useRouter();
  const [fetchedImpact, setFetchedImpact] = useState<ModuleDeleteImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const isBootcamp = context === 'bootcamp';
  const activeImpact = impact ?? fetchedImpact;
  const resolvedVideoCount = isBootcamp
    ? (videoCount ?? 0)
    : (activeImpact?.videoCount ?? 0);
  const tpFolderReady = module.tp_folder_status === 'created';

  const fetchImpact = async () => {
    if (isBootcamp || activeImpact || loadingImpact) return;
    setLoadingImpact(true);
    try {
      const res = await getModuleDeleteImpactAction(module.id);
      if (res.ok && res.data) {
        setFetchedImpact(res.data);
      } else {
        toast.error(res.error ?? 'Failed to load module deletion impact.');
      }
    } catch {
      toast.error('Failed to load module deletion impact.');
    } finally {
      setLoadingImpact(false);
    }
  };

  return (
    <DestructiveConfirmDialog
      title={`Delete module "${module.title}"?`}
      description={
        isBootcamp
          ? 'This will hide all videos inside this module and remove the TPStreams module folder. The module will be hard-deleted from the database. Module contents cannot be recovered.'
          : 'This will hide the module first and then attempt to delete its TPStreams folder and videos.'
      }
      confirmLabel="Delete Module"
      pendingLabel="Deleting module..."
      acceptedConfirmations={['DELETE MODULE', module.title]}
      confirmationHint={`Type DELETE MODULE or the exact module title: ${module.title}`}
      impactStats={[
        ...(isBootcamp
          ? [
              { label: 'Videos (will be hidden)', value: resolvedVideoCount },
              { label: 'Sort order', value: module.sort_order ?? 0 },
            ]
          : [
              {
                label: 'Videos',
                value: loadingImpact ? 'Loading...' : resolvedVideoCount,
              },
            ]),
      ]}
      warnings={
        isBootcamp
          ? [
              tpFolderReady
                ? 'The TPStreams module folder will be deleted from TPStreams.'
                : 'No TPStreams folder exists yet, so nothing to delete remotely.',
            ]
          : [
              'This deletes the TPStreams module folder using the existing official project service.',
              'The module will be unpublished and hidden before TPStreams deletion starts.',
            ]
      }
      renderTrigger={(openDialog, pending) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={pending}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={async (event) => {
                event.preventDefault();
                openDialog();
                await fetchImpact();
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete Module
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      onConfirm={async (confirmationValue) => {
        const formData = new FormData();
        if (isBootcamp) {
          if (bootcampId) formData.append('bootcamp_id', bootcampId);
        } else {
          if (pillarId) formData.append('pillar_id', pillarId);
        }
        formData.append('course_id', courseId);
        formData.append('module_id', module.id);
        formData.append('module_title', module.title);
        formData.append('confirmation', confirmationValue);
        const result = isBootcamp
          ? await deleteBootcampModuleAction(formData)
          : await deleteModuleAction(formData);
        if (result.ok) {
          refresh();
        }
        return result;
      }}
    />
  );
}
