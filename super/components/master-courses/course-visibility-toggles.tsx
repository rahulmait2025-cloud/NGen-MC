'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateCourseVisibilityAction } from '@/app/(app)/master-courses/actions';

interface CourseVisibilityTogglesProps {
  courseId: string;
  pillarId: string;
  initialVisibility: {
    visible_to_college_admins: boolean;
    visible_to_college_students: boolean;
    visible_to_global_students: boolean;
  };
  showGlobalStudents?: boolean;
  compact?: boolean;
}

export function CourseVisibilityToggles({
  courseId,
  pillarId,
  initialVisibility,
  showGlobalStudents = true,
  compact = false,
}: CourseVisibilityTogglesProps) {
  const [isPending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState(initialVisibility);
  const router = useRouter();

  function handleToggle(key: keyof typeof initialVisibility, value: boolean) {
    const nextVisibility = { ...visibility, [key]: value };
    
    // Optimistic update
    setVisibility(nextVisibility);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('course_id', courseId);
      formData.append('pillar_id', pillarId);
      Object.entries(nextVisibility).forEach(([k, v]) => {
        formData.append(k, String(v));
      });

      try {
        const result = await updateCourseVisibilityAction(formData);
        if (result.ok) {
          toast.success('Course visibility updated');
          router.refresh();
        } else {
          toast.error(result.error ?? 'Failed to update visibility');
          // Revert on error
          setVisibility(visibility);
        }
      } catch {
        toast.error('An unexpected error occurred');
        setVisibility(visibility);
      }
    });
  }

  const wrapperClassName = compact ? 'flex flex-wrap items-center gap-2' : 'grid grid-cols-1 gap-2';
  const rowClassName = compact
    ? 'flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-background border border-muted-foreground/10 min-w-[170px]'
    : 'flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-background border border-muted-foreground/10';
  const labelClassName = compact
    ? 'text-[11px] font-medium leading-none cursor-pointer'
    : 'text-[10px] font-medium leading-none cursor-pointer';
  const switchClassName = compact ? 'scale-75 origin-right' : 'scale-75 origin-right';

  return (
    <div className={wrapperClassName}>
      <div className={rowClassName}>
        <div className="flex items-center gap-1.5">
          {visibility.visible_to_college_admins ? (
            <ShieldCheck className="size-3 text-emerald-500" />
          ) : (
            <ShieldAlert className="size-3 text-muted-foreground/40" />
          )}
          <Label className={labelClassName} htmlFor={`col-admin-c-${courseId}`}>
            College Admins
          </Label>
        </div>
        <Switch
          id={`col-admin-c-${courseId}`}
          checked={visibility.visible_to_college_admins}
          onCheckedChange={(checked) => handleToggle('visible_to_college_admins', checked)}
          disabled={isPending}
          size="sm"
          className={switchClassName}
        />
      </div>

      <div className={rowClassName}>
        <div className="flex items-center gap-1.5">
          {visibility.visible_to_college_students ? (
            <ShieldCheck className="size-3 text-emerald-500" />
          ) : (
            <ShieldAlert className="size-3 text-muted-foreground/40" />
          )}
          <Label className={labelClassName} htmlFor={`col-student-c-${courseId}`}>
            College Students
          </Label>
        </div>
        <Switch
          id={`col-student-c-${courseId}`}
          checked={visibility.visible_to_college_students}
          onCheckedChange={(checked) => handleToggle('visible_to_college_students', checked)}
          disabled={isPending}
          size="sm"
          className={switchClassName}
        />
      </div>

      {showGlobalStudents && (
        <div className={rowClassName}>
          <div className="flex items-center gap-1.5">
            {visibility.visible_to_global_students ? (
              <ShieldCheck className="size-3 text-emerald-500" />
            ) : (
              <ShieldAlert className="size-3 text-muted-foreground/40" />
            )}
            <Label className={labelClassName} htmlFor={`global-student-c-${courseId}`}>
              Global Std.
            </Label>
          </div>
          <Switch
            id={`global-student-c-${courseId}`}
            checked={visibility.visible_to_global_students}
            onCheckedChange={(checked) => handleToggle('visible_to_global_students', checked)}
            disabled={isPending}
            size="sm"
            className={switchClassName}
          />
        </div>
      )}
    </div>
  );
}
