'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { setJobReadyBootcampEnabledAction } from '@/app/(app)/platform-settings/actions';

interface JobReadyBootcampToggleProps {
  initialEnabled: boolean;
}

export function JobReadyBootcampToggle({ initialEnabled }: JobReadyBootcampToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function persist(next: boolean) {
    startTransition(async () => {
      const result = await setJobReadyBootcampEnabledAction(next);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to update Job Ready Bootcamp setting.');
        return;
      }
      setEnabled(next);
      toast.success(next ? 'Job Ready Bootcamp enabled.' : 'Job Ready Bootcamp disabled.');
      router.refresh();
    });
  }

  function handleToggleChange(checked: boolean) {
    if (isPending) return;

    if (checked) {
      persist(true);
      return;
    }

    setConfirmDisableOpen(true);
  }

  function handleDisableConfirm() {
    setConfirmDisableOpen(false);
    persist(false);
  }

  const toggleId = 'job-ready-bootcamp-enabled';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="size-4" />
            Job Ready Bootcamp
          </CardTitle>
          <CardDescription>
            Controls whether the Job Ready Bootcamp is visible and purchasable across the
            student LMS — public landing/pillar/course pages, enrollment checkout, the
            &quot;My Courses&quot; bootcamp card, and the course player for bootcamp-only
            content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              {enabled ? (
                <ShieldCheck className="size-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-4 text-muted-foreground/50" />
              )}
              <Label htmlFor={toggleId} className="cursor-pointer text-sm font-medium">
                {enabled ? 'Enabled — visible to students' : 'Disabled — hidden from students'}
              </Label>
            </div>
            <Switch
              id={toggleId}
              checked={enabled}
              onCheckedChange={handleToggleChange}
              disabled={isPending}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Disabling does not delete any bootcamp data, enrollments, or progress. Existing
            enrollments resume normally once this is re-enabled.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" />
              Disable Job Ready Bootcamp?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This immediately hides all bootcamp pages and the &quot;My Courses&quot; bootcamp
              card, blocks new enrollment/checkout, and blocks course-player access to
              bootcamp-only courses — including for already-enrolled students. No data is
              deleted; everything resumes when you re-enable this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisableConfirm} disabled={isPending}>
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
