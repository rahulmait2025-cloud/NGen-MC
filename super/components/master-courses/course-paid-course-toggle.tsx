'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IndianRupee, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { PaidProductMetadataDialog } from '@/components/master-courses/paid-product-metadata-dialog';
import {
  disablePaidProductAction,
  enablePaidProductAction,
  type PaidProductSourceType,
} from '@/app/(app)/paid-product/actions';

interface CoursePaidCourseToggleProps {
  sourceType: PaidProductSourceType;
  sourceId: string;
  initialEnabled: boolean;
  disabled?: boolean;
  compact?: boolean;
  productTitle?: string;
}

export function CoursePaidCourseToggle({
  sourceType,
  sourceId,
  initialEnabled,
  disabled = false,
  compact = false,
  productTitle,
}: CoursePaidCourseToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rowClassName = compact
    ? 'flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-background border border-muted-foreground/10 min-w-[170px]'
    : 'flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-background border border-muted-foreground/10';
  const labelClassName = compact
    ? 'text-[11px] font-medium leading-none cursor-pointer'
    : 'text-[10px] font-medium leading-none cursor-pointer';
  const switchClassName = compact ? 'scale-75 origin-right' : 'scale-75 origin-right';
  const toggleId = `paid-course-${sourceType}-${sourceId}`;

  function handleToggleChange(checked: boolean) {
    if (disabled) return;

    if (checked) {
      setDialogOpen(true);
      return;
    }

    if (enabled) {
      setConfirmDisableOpen(true);
    }
  }

  function handleDisableConfirm() {
    startTransition(async () => {
      const result = await disablePaidProductAction(sourceType, sourceId);
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to disable paid course mode');
        return;
      }
      setEnabled(false);
      setConfirmDisableOpen(false);
      toast.success('Paid course mode disabled. Metadata preserved.');
      router.refresh();
    });
  }

  function handleMetadataSaved(): Promise<boolean> {
    return enablePaidProductAction(sourceType, sourceId).then((result) => {
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to enable paid course mode');
        return false;
      }
      setEnabled(true);
      toast.success('Paid course mode enabled');
      router.refresh();
      return true;
    });
  }

  function handleDialogCancel() {
    setEnabled(initialEnabled);
  }

  return (
    <>
      <div className={rowClassName}>
        <div className="flex items-center gap-1.5">
          {enabled ? (
            <ShieldCheck className="size-3 text-emerald-500" />
          ) : (
            <ShieldAlert className="size-3 text-muted-foreground/40" />
          )}
          <Label className={labelClassName} htmlFor={toggleId}>
            Paid Course
          </Label>
        </div>
        <div className="flex items-center gap-1">
          {enabled ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={isPending}
              onClick={() => setDialogOpen(true)}
              aria-label="Edit paid course metadata"
            >
              <Pencil className="size-3" />
            </Button>
          ) : null}
          <Switch
            id={toggleId}
            checked={enabled}
            onCheckedChange={handleToggleChange}
            disabled={disabled || isPending}
            size="sm"
            className={switchClassName}
          />
        </div>
      </div>

      <PaidProductMetadataDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sourceType={sourceType}
        sourceId={sourceId}
        title={productTitle ? `Paid Course — ${productTitle}` : 'Paid Course Details'}
        onSaved={handleMetadataSaved}
        onCancel={handleDialogCancel}
      />

      <AlertDialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IndianRupee className="size-4" />
              Disable paid course mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product from course pricing and the student paid catalog. Saved metadata and images are kept so you can re-enable later.
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
