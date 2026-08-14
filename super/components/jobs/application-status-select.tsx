'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { updateApplicationStatusAction } from '@/app/(app)/jobs/applications/actions';
import type { ApplicationStatus } from '@/lib/superadmin/jobs/applicant-queries';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'interview', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On Hold' },
];

interface ApplicationStatusSelectProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
  compact?: boolean;
}

export function ApplicationStatusSelect({
  applicationId,
  currentStatus,
  compact = false,
}: ApplicationStatusSelectProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [note, setNote] = useState('');

  const isWithdrawn = currentStatus === 'withdrawn';

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (newStatus === 'rejected') {
      setShowRejectForm(true);
      return;
    }

    startTransition(async () => {
      const result = await updateApplicationStatusAction(
        applicationId,
        newStatus,
        note || undefined
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}.`);
      setNote('');
      router.refresh();
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await updateApplicationStatusAction(
        applicationId,
        'rejected',
        note || undefined,
        rejectReason || undefined
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Application rejected.');
      setShowRejectForm(false);
      setRejectReason('');
      setNote('');
      router.refresh();
    });
  };

  if (isWithdrawn) {
    return (
      <Badge className="bg-gray-100 text-gray-600">Withdrawn</Badge>
    );
  }

  if (showRejectForm) {
    return (
      <div className="space-y-2 p-3 border rounded-md bg-red-50">
        <Label className="text-xs font-medium text-red-800">Rejection Reason</Label>
        <Textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          rows={2}
          className="text-sm"
        />
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Admin note (optional)..."
          rows={2}
          className="text-sm"
        />
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={pending}
          >
            {pending ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <Select
        value={currentStatus}
        onValueChange={(v) => handleStatusChange(v as ApplicationStatus)}
        disabled={pending}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={currentStatus}
          onValueChange={(v) => handleStatusChange(v as ApplicationStatus)}
          disabled={pending}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pending && <span className="text-xs text-muted-foreground">Saving...</span>}
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note for this status change (optional)..."
        rows={2}
        className="text-sm"
      />
    </div>
  );
}
