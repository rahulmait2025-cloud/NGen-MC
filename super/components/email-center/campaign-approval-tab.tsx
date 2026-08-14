'use client';

import { useState, useCallback, useReducer } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  requestCampaignApprovalAction,
  approveCampaignAction,
  rejectCampaignAction,
  cancelApprovalRequestAction,
} from '@/app/(app)/email-center/actions';
import { Loader2, ShieldCheck, ShieldX, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const approvalStatusColors: Record<string, string> = {
  not_required: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  pending_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface CampaignApprovalData {
  approval_status: string;
  approval_requested_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

interface CampaignApprovalTabProps {
  campaignId: string;
  initialStatus: string;
  approvalData: CampaignApprovalData;
  onRefresh?: () => void;
}

type ApprovalUiState = {
  approvalActing: boolean;
  actionError: string | null;
  actionSuccess: string | null;
};

type ApprovalUiAction =
  | { type: 'APPROVAL_START' }
  | { type: 'ACTION_END' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_SUCCESS'; message: string };

function approvalUiReducer(state: ApprovalUiState, action: ApprovalUiAction): ApprovalUiState {
  switch (action.type) {
    case 'APPROVAL_START':
      return { ...state, approvalActing: true, actionError: null, actionSuccess: null };
    case 'ACTION_END':
      return { ...state, approvalActing: false };
    case 'SET_ERROR':
      return { ...state, actionError: action.message, actionSuccess: null };
    case 'SET_SUCCESS':
      return { ...state, actionError: null, actionSuccess: action.message };
  }
}

export function CampaignApprovalTab({
  campaignId,
  initialStatus,
  approvalData,
  onRefresh,
}: CampaignApprovalTabProps) {
  const [{ approvalActing, actionError, actionSuccess }, dispatch] = useReducer(approvalUiReducer, {
    approvalActing: false,
    actionError: null,
    actionSuccess: null,
  });

  const [rejectReason, setRejectReason] = useState('');

  const isLocked =
    ['sending', 'sent', 'cancelled'].includes(initialStatus)
    || approvalData.approval_status === 'approved';

  const canRequestApproval = approvalData.approval_status === 'not_required';
  const canApprove = approvalData.approval_status === 'pending_review';

  const handleRequestApproval = useCallback(async () => {
    dispatch({ type: 'APPROVAL_START' });
    const r = await requestCampaignApprovalAction(campaignId, null);
    dispatch({ type: 'ACTION_END' });
    if (r.ok) {
      dispatch({ type: 'SET_SUCCESS', message: 'Approval requested.' });
      toast.success('Approval requested.');
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to request approval.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  const handleApprove = useCallback(async () => {
    dispatch({ type: 'APPROVAL_START' });
    const r = await approveCampaignAction(campaignId, null);
    dispatch({ type: 'ACTION_END' });
    if (r.ok) {
      dispatch({ type: 'SET_SUCCESS', message: 'Campaign approved.' });
      toast.success('Campaign approved.');
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to approve.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      dispatch({ type: 'SET_ERROR', message: 'Rejection reason is required.' });
      return;
    }
    dispatch({ type: 'APPROVAL_START' });
    const r = await rejectCampaignAction(campaignId, rejectReason);
    dispatch({ type: 'ACTION_END' });
    if (r.ok) {
      dispatch({ type: 'SET_SUCCESS', message: 'Campaign rejected.' });
      toast.success('Campaign rejected.');
      setRejectReason('');
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to reject.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, rejectReason, onRefresh]);

  const handleCancelApproval = useCallback(async () => {
    dispatch({ type: 'APPROVAL_START' });
    const r = await cancelApprovalRequestAction(campaignId);
    dispatch({ type: 'ACTION_END' });
    if (r.ok) {
      dispatch({ type: 'SET_SUCCESS', message: 'Approval request cancelled.' });
      toast.success('Approval request cancelled.');
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to cancel approval request.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  return (
    <div className="max-w-2xl space-y-4">
      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
      )}
      {actionSuccess && (
        <p className="text-sm text-green-600 dark:text-green-400">{actionSuccess}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={cn('text-xs font-medium', approvalStatusColors[approvalData.approval_status])}>
              {approvalData.approval_status.replace('_', ' ')}
            </Badge>
          </div>
          {approvalData.approval_requested_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Requested:</span>
              <span className="font-medium text-xs" suppressHydrationWarning>
                {new Date(approvalData.approval_requested_at).toLocaleDateString()}
              </span>
            </div>
          )}
          {approvalData.approved_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Approved:</span>
              <span className="font-medium text-xs" suppressHydrationWarning>
                {new Date(approvalData.approved_at).toLocaleDateString()}
              </span>
            </div>
          )}
          {approvalData.rejected_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rejected:</span>
              <span className="font-medium text-xs" suppressHydrationWarning>
                {new Date(approvalData.rejected_at).toLocaleDateString()}
              </span>
            </div>
          )}
          {approvalData.rejection_reason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950 text-sm">
              <p className="text-red-700 dark:text-red-300">Reason: {approvalData.rejection_reason}</p>
            </div>
          )}
          {approvalData.approval_status === 'approved' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950 text-sm">
              <p className="text-amber-700 dark:text-amber-300">
                Campaign is approved. Content, subject, and audience cannot be edited. Duplicate the campaign to create a new editable version.
              </p>
            </div>
          )}
          {isLocked && initialStatus !== 'sent' && initialStatus !== 'cancelled' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950 text-sm">
              <p className="text-amber-700 dark:text-amber-300">
                Editing is locked while the campaign is approved or actively sending. Duplicate the campaign to create a new editable version.
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {canRequestApproval && (
              <Button type="button" variant="outline" className="gap-2" onClick={handleRequestApproval} disabled={approvalActing}>
                {approvalActing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Request Approval
              </Button>
            )}
            {canApprove && (
              <>
                <Button type="button" className="gap-2" onClick={handleApprove} disabled={approvalActing}>
                  {approvalActing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Approve
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={handleCancelApproval} disabled={approvalActing}>
                  Cancel Request
                </Button>
              </>
            )}
          </div>
          {canApprove && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <div className="flex gap-2">
                <Input
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                />
                <Button type="button" variant="destructive" onClick={handleReject} disabled={approvalActing || !rejectReason.trim()}>
                  <ShieldX className="size-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
