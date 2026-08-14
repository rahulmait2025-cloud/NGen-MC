'use client';

import { MoreHorizontal, Trash2 } from 'lucide-react';

import { deleteVideoAssetAction } from '@/app/(app)/master-courses/actions';
import { DestructiveConfirmDialog } from '@/components/master-courses/destructive-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VideoDeleteImpact } from '@/lib/services/master-course-delete';

interface VideoDeleteActionProps {
  context?: 'pillar' | 'bootcamp';
  /** Required when context='pillar'. */
  pillarId?: string;
  /** Required when context='bootcamp'. */
  bootcampId?: string;
  courseId: string;
  moduleId: string;
  videoId: string;
  videoTitle: string;
  impact: VideoDeleteImpact;
}

export function VideoDeleteAction({
  context = 'pillar',
  pillarId,
  bootcampId,
  courseId,
  moduleId,
  videoId,
  videoTitle,
  impact,
}: VideoDeleteActionProps) {
  return (
    <DestructiveConfirmDialog
      title={`Delete video "${videoTitle}"?`}
      description="This removes the TPStreams asset through the existing project service and archives the local record."
      confirmLabel="Delete Video"
      pendingLabel="Deleting video..."
      impactStats={[
        { label: 'Referenced in curriculum', value: impact.isReferenced ? 'Yes' : 'No' },
      ]}
      warnings={[
        'This uses the existing official TPStreams asset delete function only.',
        'Payment and order history are preserved.',
      ]}
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
              onSelect={(event) => {
                event.preventDefault();
                openDialog();
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      onConfirm={async () => {
        const formData = new FormData();
        if (context === 'bootcamp') {
          if (bootcampId) formData.append('bootcamp_id', bootcampId);
        } else {
          if (pillarId) formData.append('pillar_id', pillarId);
        }
        formData.append('course_id', courseId);
        formData.append('module_id', moduleId);
        formData.append('video_asset_id', videoId);
        return deleteVideoAssetAction(formData);
      }}
    />
  );
}
