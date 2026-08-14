'use client';

import { SyncCourseFolderButton } from '@/components/master-courses/sync-course-folder-button';
import { syncCourseFolderAssetsAction } from './actions';

export function SyncFolderButton({
  courseId,
  disabled,
  className,
}: {
  courseId: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SyncCourseFolderButton
      courseId={courseId}
      action={syncCourseFolderAssetsAction}
      disabled={disabled}
      className={className}
    />
  );
}
