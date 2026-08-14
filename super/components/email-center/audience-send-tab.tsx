'use client';

import { useState, useCallback, useRef, useReducer } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AudienceBuilder, type AudienceConfig } from '@/components/email-center/audience-builder';
import { SendConfirmationModal } from '@/components/email-center/send-confirmation-modal';
import {
  snapshotCampaignRecipientsAction,
  sendCampaignNowAction,
  continueSendingCampaignAction,
  pauseCampaignAction,
  cancelCampaignAction,
  retryFailedCampaignEmailsAction,
} from '@/app/(app)/email-center/actions';
import { Loader2, Send, Camera, Pause, XCircle, RefreshCw, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CampaignSendStats } from '@/lib/email-center/stats';

interface AudienceSendTabProps {
  campaignId: string;
  initialStatus: string;
  campaignName: string;
  campaignSubject: string;
  audienceType: string;
  stats: CampaignSendStats;
  onRefresh?: () => void;
  initialAudienceConfig?: AudienceConfig | null;
  emailCategory?: string | null;
  isCustomComposer?: boolean;
  senderFromHeader?: string | null;
  senderReplyTo?: string | null;
}

type ActionName = 'snapshotting' | 'sending' | 'continuing' | 'pausing' | 'cancelling' | 'retrying';
type SendTabUiState = {
  loadingFlags: Record<ActionName, boolean>;
  snapshotResult: { ok: boolean; count?: number; error?: string } | null;
  sendResult: { sent: number; failed: number; skipped: number; pending: number; hasMore: boolean } | null;
  actionError: string | null;
  actionSuccess: string | null;
};

type SendTabUiAction =
  | { type: 'LOADING_START'; name: ActionName }
  | { type: 'LOADING_END'; name: ActionName }
  | { type: 'SET_SNAPSHOT_RESULT'; result: SendTabUiState['snapshotResult'] }
  | { type: 'SET_SEND_RESULT'; result: SendTabUiState['sendResult'] }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_SUCCESS'; message: string }
  | { type: 'CLEAR_FEEDBACK' };

function sendTabUiReducer(state: SendTabUiState, action: SendTabUiAction): SendTabUiState {
  switch (action.type) {
    case 'LOADING_START': return { ...state, loadingFlags: { ...state.loadingFlags, [action.name]: true } };
    case 'LOADING_END': return { ...state, loadingFlags: { ...state.loadingFlags, [action.name]: false } };
    case 'SET_SNAPSHOT_RESULT': return { ...state, snapshotResult: action.result };
    case 'SET_SEND_RESULT': return { ...state, sendResult: action.result };
    case 'SET_ERROR': return { ...state, actionError: action.message, actionSuccess: null };
    case 'SET_SUCCESS': return { ...state, actionError: null, actionSuccess: action.message };
    case 'CLEAR_FEEDBACK': return { ...state, actionError: null, actionSuccess: null, snapshotResult: null };
  }
}

interface SendingStatsCardProps {
  stats: CampaignSendStats;
  hasPendingEmails: boolean;
  sendResult: SendTabUiState['sendResult'];
  canSendNow: boolean;
  canContinue: boolean;
  canPause: boolean;
  canCancel: boolean;
  canRetry: boolean;
  sending: boolean;
  continuing: boolean;
  pausing: boolean;
  cancelling: boolean;
  retrying: boolean;
  setShowSendModal: (v: boolean) => void;
  handleContinue: () => void;
  handlePause: () => void;
  handleCancel: () => void;
  handleRetry: () => void;
  actionError: string | null;
  actionSuccess: string | null;
}

function SendingStatsCard({
  stats, hasPendingEmails, sendResult, canSendNow, canContinue, canPause, canCancel, canRetry,
  sending, continuing, pausing, cancelling, retrying,
  setShowSendModal, handleContinue, handlePause, handleCancel, handleRetry,
  actionError, actionSuccess,
}: SendingStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-5" />
          Sending Details & Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-muted-foreground text-xs">Total Target</p>
            <p className="text-lg font-semibold">{stats.totalRecipients}</p>
          </div>
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-muted-foreground text-xs">Snapshotted</p>
            <p className="text-lg font-semibold">{stats.snapshotted}</p>
          </div>
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-muted-foreground text-xs">Pending</p>
            <p className="text-lg font-semibold">{stats.outboxQueued + stats.outboxProcessing}</p>
          </div>
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-3">
            <p className="text-muted-foreground text-xs">Outbox Sent</p>
            <p className="text-lg font-semibold text-blue-600">{stats.outboxSent}</p>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-3">
            <p className="text-muted-foreground text-xs">Delivered</p>
            <p className="text-lg font-semibold text-green-600">{stats.delivered}</p>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-950 p-3">
            <p className="text-muted-foreground text-xs">Failed</p>
            <p className="text-lg font-semibold text-red-600">{stats.failed}</p>
          </div>
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950 p-3">
            <p className="text-muted-foreground text-xs">Skipped</p>
            <p className="text-lg font-semibold text-amber-600">{stats.skipped}</p>
          </div>
          <div className="rounded-lg border bg-orange-50 dark:bg-orange-950 p-3">
            <p className="text-muted-foreground text-xs">Suppressed</p>
            <p className="text-lg font-semibold text-orange-600">{stats.suppressed}</p>
          </div>
        </div>

        {hasPendingEmails && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {stats.outboxQueued + stats.outboxProcessing} emails still pending. Click Continue Sending to process the remaining batch.
              </p>
            </div>
          </div>
        )}

        {sendResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950 text-sm">
            <p className="text-green-600 dark:text-green-400">
              Sent: {sendResult.sent} | Failed: {sendResult.failed} | Skipped: {sendResult.skipped}
              {sendResult.pending > 0 ? ` | Pending: ${sendResult.pending}` : ' | Complete'}
            </p>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          {canSendNow && stats.snapshotted > 0 && (
            <Button type="button" onClick={() => setShowSendModal(true)} className="gap-2 flex-1" disabled={sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? 'Sending...' : 'Send Now'}
            </Button>
          )}
          {canContinue && (
            <Button type="button" variant="default" onClick={handleContinue} disabled={continuing} className="gap-2 flex-1">
              {continuing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {continuing ? 'Sending...' : 'Continue Sending'}
            </Button>
          )}
          {canPause && (
            <Button type="button" variant="outline" onClick={handlePause} disabled={pausing} className="gap-2">
              {pausing ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
              {pausing ? 'Pausing...' : 'Pause'}
            </Button>
          )}
          {canCancel && (
            <Button type="button" variant="outline" onClick={handleCancel} disabled={cancelling} className="gap-2 text-red-600">
              {cancelling ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
          {canRetry && (
            <Button type="button" variant="outline" onClick={handleRetry} disabled={retrying} className="gap-2">
              {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {retrying ? 'Retrying...' : 'Retry Failed'}
            </Button>
          )}
        </div>

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950 text-sm">
            <p className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="size-4" />{actionError}
            </p>
          </div>
        )}
        {actionSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950 text-sm">
            <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="size-4" />{actionSuccess}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AudienceSendTab({
  campaignId,
  initialStatus,
  campaignName,
  campaignSubject,
  audienceType,
  stats,
  onRefresh,
  initialAudienceConfig,
  emailCategory,
  isCustomComposer = false,
  senderFromHeader = null,
  senderReplyTo = null,
}: AudienceSendTabProps) {
  const audienceConfig = useRef<AudienceConfig | null>(initialAudienceConfig ?? null);
  const requireTransactionalConfirm = emailCategory === 'transactional_essential';

  const [ui, dispatch] = useReducer(sendTabUiReducer, {
    loadingFlags: { snapshotting: false, sending: false, continuing: false, pausing: false, cancelling: false, retrying: false },
    snapshotResult: null,
    sendResult: null,
    actionError: null,
    actionSuccess: null,
  });
  const { snapshotting, sending, continuing, pausing, cancelling, retrying } = ui.loadingFlags;
  const { snapshotResult, sendResult, actionError, actionSuccess } = ui;

  const [showSendModal, setShowSendModal] = useState(false);
  const [localStatus, setLocalStatus] = useState(initialStatus);

  const canEdit = ['draft', 'test_sent', 'ready'].includes(localStatus);
  const canSnapshot = canEdit;
  const canSendNow = canEdit && stats.snapshotted > 0;
  const canContinue = localStatus === 'sending' && (stats.outboxQueued > 0 || stats.outboxProcessing > 0);
  const canPause = localStatus === 'sending';
  const canCancel = ['ready', 'sending'].includes(localStatus);
  const canRetry = stats.failed > 0 || stats.outboxFailed > 0;
  const hasPendingEmails = localStatus === 'sending' && (stats.outboxQueued > 0 || stats.outboxProcessing > 0);

  const handleSnapshot = useCallback(async () => {
    if (!audienceConfig.current) {
      const message = 'Please select an audience and preview it before snapshotting.';
      dispatch({ type: 'SET_SNAPSHOT_RESULT', result: { ok: false, error: message } });
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
      return;
    }
    dispatch({ type: 'LOADING_START', name: 'snapshotting' });
    dispatch({ type: 'CLEAR_FEEDBACK' });
    const r = await snapshotCampaignRecipientsAction(campaignId, JSON.stringify(audienceConfig.current));
    dispatch({ type: 'SET_SNAPSHOT_RESULT', result: r });
    if (!r.ok && r.error) {
      dispatch({ type: 'SET_ERROR', message: r.error });
      toast.error(r.error);
    }
    dispatch({ type: 'LOADING_END', name: 'snapshotting' });
    onRefresh?.();
  }, [campaignId, onRefresh]);

  const handleSendFromModal = useCallback(async (options?: { transactionalConfirmed?: boolean }) => {
    dispatch({ type: 'LOADING_START', name: 'sending' });
    dispatch({ type: 'CLEAR_FEEDBACK' });
    const r = await sendCampaignNowAction(campaignId, true, options);
    dispatch({ type: 'LOADING_END', name: 'sending' });
    if (r.ok) {
      setLocalStatus('sending');
      setShowSendModal(false);
      const suppressedNote =
        (r.suppressedCount ?? 0) > 0
          ? ` ${r.suppressedCount} recipient(s) skipped due to email preferences.`
          : '';
      const pendingNote = r.hasMore ? ` ${r.pending ?? 0} still pending — click Continue Sending.` : '';
      const successMessage = `Sent ${r.sent ?? 0} emails.${suppressedNote}${pendingNote}`;
      dispatch({
        type: 'SET_SEND_RESULT',
        result: {
          sent: r.sent ?? 0,
          failed: r.failed ?? 0,
          skipped: r.skipped ?? 0,
          pending: r.pending ?? 0,
          hasMore: r.hasMore ?? false,
        },
      });
      dispatch({ type: 'SET_SUCCESS', message: successMessage });
      toast.success(successMessage);
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to send campaign.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  const handleContinue = useCallback(async () => {
    dispatch({ type: 'LOADING_START', name: 'continuing' });
    dispatch({ type: 'CLEAR_FEEDBACK' });
    const r = await continueSendingCampaignAction(campaignId);
    dispatch({ type: 'LOADING_END', name: 'continuing' });
    if (r.ok) {
      const pendingNote = r.hasMore ? ` ${r.pending ?? 0} still pending.` : ' Send complete.';
      const successMessage = `Sent ${r.sent ?? 0} more emails.${pendingNote}`;
      dispatch({
        type: 'SET_SEND_RESULT',
        result: {
          sent: r.sent ?? 0,
          failed: r.failed ?? 0,
          skipped: r.skipped ?? 0,
          pending: r.pending ?? 0,
          hasMore: r.hasMore ?? false,
        },
      });
      dispatch({ type: 'SET_SUCCESS', message: successMessage });
      toast.success(successMessage);
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to continue sending.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  const handlePause = useCallback(async () => {
    dispatch({ type: 'LOADING_START', name: 'pausing' });
    dispatch({ type: 'CLEAR_FEEDBACK' });
    const r = await pauseCampaignAction(campaignId);
    dispatch({ type: 'LOADING_END', name: 'pausing' });
    if (r.ok) {
      setLocalStatus('draft');
      dispatch({ type: 'SET_SUCCESS', message: 'Campaign paused.' });
      toast.success('Campaign paused.');
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to pause campaign.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  const handleCancel = useCallback(async () => {
    dispatch({ type: 'LOADING_START', name: 'cancelling' });
    dispatch({ type: 'CLEAR_FEEDBACK' });
    const r = await cancelCampaignAction(campaignId);
    dispatch({ type: 'LOADING_END', name: 'cancelling' });
    if (r.ok) {
      setLocalStatus('cancelled');
      dispatch({ type: 'SET_SUCCESS', message: 'Campaign cancelled.' });
      toast.success('Campaign cancelled.');
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to cancel campaign.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  const handleRetry = useCallback(async () => {
    dispatch({ type: 'LOADING_START', name: 'retrying' });
    dispatch({ type: 'CLEAR_FEEDBACK' });
    const r = await retryFailedCampaignEmailsAction(campaignId);
    dispatch({ type: 'LOADING_END', name: 'retrying' });
    if (r.ok) {
      const message = r.retryCount ? `Retry queued for ${r.retryCount} failed emails.` : 'Retry queued.';
      dispatch({ type: 'SET_SUCCESS', message });
      toast.success(message);
      onRefresh?.();
    } else {
      const message = r.error ?? 'Failed to retry failed emails.';
      dispatch({ type: 'SET_ERROR', message });
      toast.error(message);
    }
  }, [campaignId, onRefresh]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Audience Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950 text-sm">
                <p className="text-amber-700 dark:text-amber-300">
                  <span className="font-medium">Test email</span> sends only to one address.
                  <span className="font-medium"> Send Now</span> delivers to all snapshotted recipients immediately.
                </p>
              </div>
              <AudienceBuilder
                campaignId={campaignId}
                onConfigChange={(config) => { audienceConfig.current = config; }}
                initialConfig={initialAudienceConfig}
                isCustomComposer={isCustomComposer}
              />
            </>
          )}

          {canSnapshot && (
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              onClick={handleSnapshot}
              disabled={snapshotting}
            >
              {snapshotting ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {snapshotting ? 'Snapshotting...' : 'Save Audience & Snapshot Recipients'}
            </Button>
          )}

          {snapshotResult && (
            <div className={`rounded-lg border p-3 text-sm ${
              snapshotResult.ok ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' :
              'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
            }`}>
              {snapshotResult.ok ? (
                <p className="text-green-600 dark:text-green-400">
                  Snapshot complete: {snapshotResult.count} recipients saved.
                </p>
              ) : (
                <p className="text-red-600 dark:text-red-400">{snapshotResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SendingStatsCard
        stats={stats}
        hasPendingEmails={hasPendingEmails}
        sendResult={sendResult}
        canSendNow={canSendNow}
        canContinue={canContinue}
        canPause={canPause}
        canCancel={canCancel}
        canRetry={canRetry}
        sending={sending}
        continuing={continuing}
        pausing={pausing}
        cancelling={cancelling}
        retrying={retrying}
        setShowSendModal={setShowSendModal}
        handleContinue={handleContinue}
        handlePause={handlePause}
        handleCancel={handleCancel}
        handleRetry={handleRetry}
        actionError={actionError}
        actionSuccess={actionSuccess}
      />

      <SendConfirmationModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        campaignName={campaignName}
        campaignSubject={campaignSubject}
        audienceType={audienceType}
        recipientCount={stats.totalRecipients > 0 ? stats.totalRecipients : stats.snapshotted}
        validCount={stats.snapshotted > 0 ? stats.snapshotted : (stats.totalRecipients - stats.suppressed)}
        suppressedCount={stats.suppressed}
        loading={sending}
        requireTransactionalConfirm={requireTransactionalConfirm}
        senderFromHeader={senderFromHeader}
        senderReplyTo={senderReplyTo}
        onConfirm={handleSendFromModal}
      />
    </div>
  );
}
