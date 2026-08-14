'use client';

import { useMemo, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EMPTY_ACCEPTED_CONFIRMATIONS: string[] = [];
const EMPTY_IMPACT_STATS: ImpactStat[] = [];
const EMPTY_WARNINGS: string[] = [];

interface ImpactStat {
  label: string;
  value: number | string;
}

interface DestructiveConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  confirmationHint?: string;
  acceptedConfirmations?: string[];
  impactStats?: ImpactStat[];
  warnings?: string[];
  renderTrigger: (openDialog: () => void, pending: boolean) => React.ReactNode;
  onConfirm: (confirmationValue: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
}

export function DestructiveConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel = 'Deleting...',
  confirmationHint,
  acceptedConfirmations = EMPTY_ACCEPTED_CONFIRMATIONS,
  impactStats = EMPTY_IMPACT_STATS,
  warnings = EMPTY_WARNINGS,
  renderTrigger,
  onConfirm,
}: DestructiveConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmationValue, setConfirmationValue] = useState('');

  const normalizedAccepted = useMemo(
    () => acceptedConfirmations.flatMap((value) => { const t = value.trim(); return t ? [t] : []; }),
    [acceptedConfirmations],
  );

  const requiresTypedConfirmation = normalizedAccepted.length > 0;
  const canConfirm =
    !pending &&
    (!requiresTypedConfirmation || normalizedAccepted.includes(confirmationValue.trim()));

  async function handleConfirm() {
    if (!canConfirm) return;

    setPending(true);
    try {
      const result = await onConfirm(confirmationValue.trim());
      if (result.ok) {
        toast.success(result.message ?? 'Delete completed.');
        setOpen(false);
        setConfirmationValue('');
      } else {
        toast.error(result.error ?? 'Delete failed.');
      }
    } catch {
      toast.error('Delete failed.');
    } finally {
      setPending(false);
    }
  }

  const trigger = renderTrigger(() => setOpen(true), pending);

  return (
    <>
      {trigger}

      <AlertDialog open={open} onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) {
          setConfirmationValue('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          {(impactStats.length > 0 || warnings.length > 0 || requiresTypedConfirmation) && (
            <div className="space-y-4">
              {impactStats.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Impact Preview
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {impactStats.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <TriangleAlert className="size-4" />
                    Warnings
                  </div>
                  <div className="space-y-2 text-sm">
                    {warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              {requiresTypedConfirmation && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="delete-confirmation">
                    Confirmation
                  </label>
                  <Input
                    id="delete-confirmation"
                    value={confirmationValue}
                    onChange={(event) => setConfirmationValue(event.target.value)}
                    placeholder={normalizedAccepted[0]}
                    disabled={pending}
                  />
                  {confirmationHint && (
                    <p className="text-xs text-muted-foreground">{confirmationHint}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <Button variant="destructive" disabled={!canConfirm} onClick={handleConfirm}>
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
