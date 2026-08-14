'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { deleteBootcampCourseAction } from '@/app/(app)/bootcamps/actions';
import { DestructiveConfirmDialog } from '@/components/master-courses/destructive-confirm-dialog';

interface BootcampCourseCardDeleteButtonProps {
  bootcampId: string;
  courseId: string;
  courseTitle: string;
}

export function BootcampCourseCardDeleteButton({
  bootcampId,
  courseId,
  courseTitle,
}: BootcampCourseCardDeleteButtonProps) {
  const { refresh } = useRouter();

  return (
    <DestructiveConfirmDialog
      title={`Delete course "${courseTitle}"?`}
      description="This permanently deletes the course, revokes all student access, and removes TPStreams content."
      confirmLabel="Delete Course"
      pendingLabel="Deleting course..."
      acceptedConfirmations={['DELETE COURSE', courseTitle]}
      confirmationHint={`Type DELETE COURSE or the exact course title: ${courseTitle}`}
      impactStats={[]}
      warnings={[
        'All student access will be revoked.',
        'TPStreams content will be deleted.',
        'This action cannot be undone.',
      ]}
      renderTrigger={(openDialog) => (
        <button type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openDialog();
          }}
          className="inline-flex items-center justify-center gap-1 h-8 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-destructive/5 hover:text-destructive hover:border-destructive/40 transition-colors"
        >
          <Trash2 className="size-3" />
          Delete
        </button>
      )}
      onConfirm={async (confirmationValue) => {
        const formData = new FormData();
        formData.append('bootcamp_id', bootcampId);
        formData.append('course_id', courseId);
        formData.append('course_title', courseTitle);
        formData.append('confirmation', confirmationValue);

        const result = await deleteBootcampCourseAction(formData);
        if (result.ok) {
          refresh();
        }
        return result;
      }}
    />
  );
}
