'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, MoreVertical, Globe, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RetryPillarSyncButton } from './retry-pillar-sync-button';
import { DestructiveConfirmDialog } from './destructive-confirm-dialog';
import type { MasterCoursePillarStatsRow } from '@/types/database';
import type { PillarDeleteImpact } from '@/lib/services/master-course-delete';
import { deletePillarAction, updatePillarAction } from '@/app/(app)/master-courses/actions';

interface PillarCardActionsProps {
  pillar: MasterCoursePillarStatsRow;
  deleteImpact: PillarDeleteImpact;
}

export function PillarCardActions({ pillar, deleteImpact }: PillarCardActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { refresh } = useRouter();

  async function handlePublishStatus(status: 'published' | 'unpublished') {
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('pillar_id', pillar.pillar_id);
      formData.append('publish_status', status);

      const result = await updatePillarAction(formData);
      if (result.ok) {
        toast.success(`Pillar ${status === 'published' ? 'published' : 'unpublished'} successfully`);
        refresh();
      } else {
        toast.error(result.error ?? 'Failed to update pillar status');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 pointer-events-auto"
          disabled={isUpdating}
          onClick={(event) => event.stopPropagation()}
        >
          {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 pointer-events-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel>Pillar Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/master-courses/pillars/${pillar.pillar_id}`}>
            <BookOpen className="mr-2 size-4" />
            View Courses
          </Link>
        </DropdownMenuItem>
        
        {/* Note: Edit Dialog will be wired here in a future phase */}
        <DropdownMenuItem className="cursor-pointer">
          <Plus className="mr-2 size-4" />
          Edit Metadata
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />

        {pillar.publish_status !== 'published' && (
          <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-700" onClick={() => handlePublishStatus('published')}>
            <Globe className="mr-2 size-4" />
            Publish Pillar
          </DropdownMenuItem>
        )}
        {pillar.publish_status === 'published' && (
          <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-700" onClick={() => handlePublishStatus('unpublished')}>
            <EyeOff className="mr-2 size-4" />
            Unpublish Pillar
          </DropdownMenuItem>
        )}
        
        {pillar.tp_folder_status !== 'created' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <RetryPillarSyncButton 
                pillarId={pillar.pillar_id} 
                variant="ghost" 
                className="w-full justify-start h-auto p-0 font-normal px-2 py-1.5 hover:bg-transparent" 
              />
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DestructiveConfirmDialog
          title={`Delete pillar "${pillar.title}"?`}
          description="This permanently deletes the pillar. Courses will be unlinked and remain available."
          confirmLabel="Delete Pillar"
          pendingLabel="Deleting pillar..."
          acceptedConfirmations={['DELETE PILLAR', pillar.title]}
          confirmationHint={`Type DELETE PILLAR or the exact pillar title: ${pillar.title}`}
          impactStats={[
            { label: 'Courses', value: deleteImpact.courseCount },
            { label: 'Modules', value: deleteImpact.moduleCount },
            { label: 'Videos', value: deleteImpact.videoCount },
            { label: 'College assignments', value: deleteImpact.assignmentCount },
            { label: 'Active B2B entitlements', value: deleteImpact.activeB2bEntitlementCount },
            { label: 'Active B2C entitlements', value: deleteImpact.activeB2cEntitlementCount },
            { label: 'Active free course enrollments', value: deleteImpact.activeFreeCourseEntitlementCount },
          ]}
          warnings={[
            ...(deleteImpact.paidOrderCount > 0
              ? [`Paid B2C history exists (${deleteImpact.paidOrderCount} orders). Order records are preserved.`]
              : []),
          ]}
          renderTrigger={(openDialog) => (
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={(event) => {
                event.preventDefault();
                openDialog();
              }}
            >
              Delete Pillar
            </DropdownMenuItem>
          )}
          onConfirm={async (confirmationValue) => {
            const formData = new FormData();
            formData.append('pillar_id', pillar.pillar_id);
            formData.append('pillar_title', pillar.title);
            formData.append('confirmation', confirmationValue);
            
            const result = await deletePillarAction(formData);
            if (result.ok) {
              refresh();
            }
            return result;
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
