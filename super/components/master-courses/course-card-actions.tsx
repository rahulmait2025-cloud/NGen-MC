'use client';

import Link from 'next/link';
import { Layers, MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateCourseDialog } from './create-course-dialog';
import { DestructiveConfirmDialog } from './destructive-confirm-dialog';
import { RetryCourseSyncButton } from './retry-course-sync-button';
import { MoveCourseDialog } from './move-course-dialog';
import type { CourseDeleteImpact } from '@/lib/services/master-course-delete';
import type { MasterCourseWithStats } from '@/lib/services/master-courses';
import type { MasterCoursePillarStatsRow } from '@/types/database';
import { deleteCourseAction } from '@/app/(app)/master-courses/actions';

const EMPTY_ALL_PILLARS: MasterCoursePillarStatsRow[] = [];

interface CourseCardActionsProps {
  course: MasterCourseWithStats;
  pillarId: string;
  deleteImpact: CourseDeleteImpact;
  allPillars?: MasterCoursePillarStatsRow[];
}

export function CourseCardActions({ course, pillarId, deleteImpact, allPillars = EMPTY_ALL_PILLARS }: CourseCardActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={(event) => event.stopPropagation()}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel>Course Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/master-courses/pillars/${pillarId}/courses/${course.id}`}>
            <Layers className="mr-2 size-4" />
            Open Course
          </Link>
        </DropdownMenuItem>
        
        {allPillars.length > 1 && (
          <MoveCourseDialog
            courseId={course.id}
            courseTitle={course.title}
            currentPillarId={pillarId}
            pillars={allPillars}
          />
        )}
        
        <CreateCourseDialog 
          pillarId={pillarId} 
          course={course} 
          mode="menuitem"
        />
        
        <DropdownMenuSeparator />
        
        {course.tp_folder_status !== 'created' && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <RetryCourseSyncButton 
              courseId={course.id} 
              pillarId={pillarId} 
              variant="ghost" 
              className="w-full justify-start h-auto p-0 font-normal px-2 py-1.5 hover:bg-transparent" 
            />
          </DropdownMenuItem>
        )}
        
        {course.publish_status === 'published' ? (
          <DropdownMenuItem className="cursor-not-allowed text-destructive/80" disabled>
            Delete Course
            <div className="text-xs text-muted-foreground mt-1">Published master courses cannot be deleted. You can edit them or archive them.</div>
          </DropdownMenuItem>
        ) : (
        <DestructiveConfirmDialog
          title={`Delete course "${course.title}"?`}
          description="This revokes college assignments first, hides the course, and deletes TPStreams content only when no paid B2C history exists."
          confirmLabel={deleteImpact.archiveOnly ? 'Archive Course' : 'Delete Course'}
          pendingLabel={deleteImpact.archiveOnly ? 'Archiving course...' : 'Deleting course...'}
          acceptedConfirmations={['DELETE COURSE', course.title]}
          confirmationHint={`Type DELETE COURSE or the exact course title: ${course.title}`}
          impactStats={[
            { label: 'Modules', value: deleteImpact.moduleCount },
            { label: 'Videos', value: deleteImpact.videoCount },
            { label: 'College assignments', value: deleteImpact.assignmentCount },
            { label: 'Active B2B entitlements', value: deleteImpact.activeB2bEntitlementCount },
            { label: 'Active B2C entitlements', value: deleteImpact.activeB2cEntitlementCount },
            { label: 'Active free course enrollments', value: deleteImpact.activeFreeCourseEntitlementCount },
          ]}
          warnings={[
            deleteImpact.paidOrderCount > 0
              ? `Paid B2C history found (${deleteImpact.paidOrderCount} orders). This action will archive only and keep TPStreams assets intact.`
              : 'TPStreams course folder deletion will run only after access cleanup succeeds.',
            deleteImpact.activeB2cEntitlementCount > 0
              ? `${deleteImpact.activeB2cEntitlementCount} active B2C entitlements exist. History is preserved.`
              : 'Payment and order history are preserved.',
          ]}
          renderTrigger={(openDialog) => (
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={(event) => {
                event.preventDefault();
                openDialog();
              }}
            >
              Delete Course
            </DropdownMenuItem>
          )}
          onConfirm={async (confirmationValue) => {
            const formData = new FormData();
            formData.append('pillar_id', pillarId);
            formData.append('course_id', course.id);
            formData.append('course_title', course.title);
            formData.append('confirmation', confirmationValue);
            return deleteCourseAction(formData);
          }}
        />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
