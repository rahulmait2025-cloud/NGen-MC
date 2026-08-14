'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { deleteBootcampCourseAction } from '@/app/(app)/bootcamps/actions';
import { DestructiveConfirmDialog } from '@/components/master-courses/destructive-confirm-dialog';
import type { BootcampCourseDeleteImpact } from '@/lib/services/bootcamp-courses';

interface BootcampCourseDeleteActionProps {
  bootcampId: string;
  course: {
    id: string;
    title: string;
    publish_status: string;
  };
  deleteImpact: BootcampCourseDeleteImpact;
}

export function BootcampCourseDeleteAction({
  bootcampId,
  course,
  deleteImpact,
}: BootcampCourseDeleteActionProps) {
  const { push } = useRouter();

  const isPublished = course.publish_status === 'published';

  if (isPublished) {
    return null;
  }

  return (
    <DestructiveConfirmDialog
      title={`Delete course "${course.title}"?`}
      description="This permanently deletes the course, revokes all student access, and removes TPStreams content."
      confirmLabel="Delete Course"
      pendingLabel="Deleting course..."
      acceptedConfirmations={['DELETE COURSE', course.title]}
      confirmationHint={`Type DELETE COURSE or the exact course title: ${course.title}`}
      impactStats={[
        { label: 'Modules', value: deleteImpact.moduleCount },
        { label: 'Videos', value: deleteImpact.videoCount },
        { label: 'Active B2C entitlements', value: deleteImpact.activeB2cEntitlementCount },
        { label: 'Active free course enrollments', value: deleteImpact.activeFreeCourseEntitlementCount },
      ]}
      warnings={[
        ...(deleteImpact.activeB2cEntitlementCount > 0
          ? [`${deleteImpact.activeB2cEntitlementCount} active B2C entitlements will be revoked.`]
          : []),
        ...(deleteImpact.activeFreeCourseEntitlementCount > 0
          ? [`${deleteImpact.activeFreeCourseEntitlementCount} active free course enrollments will be revoked.`]
          : []),
        ...(deleteImpact.paidOrderCount > 0
          ? [`Paid order history exists (${deleteImpact.paidOrderCount} orders). Order records are preserved.`]
          : []),
      ]}
      renderTrigger={(openDialog) => (
        <button type="button"
          onClick={(e) => {
            e.preventDefault();
            openDialog();
          }}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <Trash2 className="size-4" />
          Delete Course
        </button>
      )}
      onConfirm={async (confirmationValue) => {
        const formData = new FormData();
        formData.append('bootcamp_id', bootcampId);
        formData.append('course_id', course.id);
        formData.append('course_title', course.title);
        formData.append('confirmation', confirmationValue);

        const result = await deleteBootcampCourseAction(formData);
        if (result.ok) {
          push(`/bootcamps/${bootcampId}`);
        }
        return result;
      }}
    />
  );
}
