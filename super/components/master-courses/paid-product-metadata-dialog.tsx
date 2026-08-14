'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaidCourseLandingSettings } from '@/components/master-courses/paid-course-landing-settings';
import type { PaidProductSourceType } from '@/app/(app)/paid-product/actions';

interface PaidProductMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: PaidProductSourceType;
  sourceId: string;
  title?: string;
  /** Returns true when paid mode was enabled; dialog stays open on false. */
  onSaved: () => Promise<boolean>;
  onCancel?: () => void;
}

export function PaidProductMetadataDialog({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  title = 'Paid Course Details',
  onSaved,
  onCancel,
}: PaidProductMetadataDialogProps) {
  const [savedSignal, setSavedSignal] = useState(0);
  const [isEnabling, setIsEnabling] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel?.();
          setSavedSignal(0);
          setIsEnabling(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Add landing page metadata required before this product can be sold as a paid course.
          </DialogDescription>
        </DialogHeader>

        <PaidCourseLandingSettings
          courseId={sourceType === 'master_course' ? sourceId : undefined}
          variantId={sourceType === 'course_variant' ? sourceId : undefined}
          enabled
          embedded
          saveSignal={savedSignal}
          onSaveSuccess={async () => {
            setIsEnabling(true);
            try {
              const enabled = await onSaved();
              if (enabled) {
                onOpenChange(false);
              }
            } finally {
              setIsEnabling(false);
            }
          }}
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isEnabling}
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isEnabling}
            onClick={() => setSavedSignal((n) => n + 1)}
          >
            {isEnabling ? 'Enabling…' : 'Save & enable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
