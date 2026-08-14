'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, Send } from 'lucide-react';

interface SendConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  campaignSubject: string;
  audienceType: string;
  recipientCount: number;
  validCount: number;
  suppressedCount: number;
  loading?: boolean;
  requireTransactionalConfirm?: boolean;
  senderFromHeader?: string | null;
  senderReplyTo?: string | null;
  onConfirm: (options?: { transactionalConfirmed?: boolean }) => Promise<void>;
}

export function SendConfirmationModal({
  open,
  onOpenChange,
  campaignName,
  campaignSubject,
  audienceType,
  recipientCount,
  validCount,
  suppressedCount,
  loading = false,
  requireTransactionalConfirm = false,
  senderFromHeader = null,
  senderReplyTo = null,
  onConfirm,
}: SendConfirmationModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [transactionalConfirmed, setTransactionalConfirmed] = useState(false);

  const expectedText = 'SEND CAMPAIGN';
  const canConfirm =
    typedConfirmation === expectedText
    && (!requireTransactionalConfirm || transactionalConfirmed);

  const handleSend = async () => {
    if (!canConfirm) return;
    await onConfirm(
      requireTransactionalConfirm ? { transactionalConfirmed: true } : undefined
    );
    setTypedConfirmation('');
    setTransactionalConfirmed(false);
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setTypedConfirmation('');
      setTransactionalConfirmed(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5" />
            Confirm Campaign Send
          </DialogTitle>
          <DialogDescription>
            This will queue emails for real sending. Emails will be processed in batches.
            This action cannot be undone after emails are sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Campaign:</span>
              <span className="font-medium">{campaignName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject:</span>
              <span className="font-medium max-w-[250px] truncate">{campaignSubject}</span>
            </div>
            {senderFromHeader ? (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground shrink-0">From:</span>
                <span className="font-medium text-right break-all">{senderFromHeader}</span>
              </div>
            ) : null}
            {senderReplyTo ? (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground shrink-0">Reply-To:</span>
                <span className="font-medium text-right break-all">{senderReplyTo}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Audience:</span>
              <span className="font-medium capitalize">
                {audienceType === 'manual_emails' || audienceType === 'external'
                  ? 'External Email Addresses'
                  : audienceType.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Recipients:</span>
              <span className="font-medium">{recipientCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valid (after dedup/suppress):</span>
              <span className="font-medium text-green-600">{validCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Suppressed:</span>
              <span className="font-medium text-amber-600">{suppressedCount.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Warning: This will send real emails
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Emails will be queued and processed in batches. You can pause or cancel
                  while sending, but already sent emails cannot be recalled.
                  {suppressedCount > 0 && ` ${suppressedCount} suppressed recipient(s) will be excluded.`}
                </p>
              </div>
            </div>
          </div>

          {requireTransactionalConfirm ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <label className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-100">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={transactionalConfirmed}
                  onChange={(e) => setTransactionalConfirmed(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  Transactional emails bypass normal marketing preferences. Use this only for
                  essential account, payment, access, security, or service-related communication.
                  I confirm this Custom Email / campaign is essential.
                </span>
              </label>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="confirm-typed" className="text-sm font-medium">
              Type <span className="font-semibold text-destructive">{expectedText}</span> to confirm:
            </Label>
            <Input
              id="confirm-typed"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={expectedText}
              disabled={loading}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canConfirm || loading} variant="destructive">
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Queue & Send Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
