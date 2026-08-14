'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { Loader2, Trash2, FileCheck, FileX, Copy, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {
  publishBundleAction,
  unpublishBundleAction,
  deleteBundleAction,
  cloneBundleAction,
  rebuildBundleResolvedItemsAction,
} from '../actions';

interface BundleDetailClientProps {
  bundle: { id: string; publish_status: string };
}

export function BundleDetailClient({ bundle }: BundleDetailClientProps) {
  const { push, refresh } = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handlePublish = async () => {
    setIsProcessing(true);
    setStatus('idle');
    try {
      const result = await publishBundleAction(bundle.id);
      if (result.success) {
        setStatus('success');
        setStatusMessage('Bundle published.');
        refresh();
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to publish bundle');
      }
    } catch {
      setStatus('error');
      setStatusMessage('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsProcessing(true);
    setStatus('idle');
    try {
      const result = await unpublishBundleAction(bundle.id);
      if (result.success) {
        setStatus('success');
        setStatusMessage('Bundle unpublished.');
        refresh();
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to unpublish bundle');
      }
    } catch {
      setStatus('error');
      setStatusMessage('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClone = async () => {
    setIsProcessing(true);
    setStatus('idle');
    try {
      const result = await cloneBundleAction(bundle.id);
      if (result.success && result.data) {
        setStatus('success');
        setStatusMessage('Bundle cloned.');
        push(`/bundles/${result.data.id}`);
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to clone bundle');
      }
    } catch {
      setStatus('error');
      setStatusMessage('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);
    setIsProcessing(true);
    setStatus('idle');
    try {
      const result = await deleteBundleAction(bundle.id);
      if (result.success) {
        setStatus('success');
        setStatusMessage('Bundle deleted.');
        push('/bundles');
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to delete bundle');
      }
    } catch {
      setStatus('error');
      setStatusMessage('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRebuildResolved = async () => {
    setIsProcessing(true);
    setStatus('idle');
    try {
      const result = await rebuildBundleResolvedItemsAction(bundle.id);
      if (result.success && result.data) {
        setStatus('success');
        setStatusMessage(`Rebuilt: ${result.data.resolvedCount} resolved, ${result.data.duplicateCount} duplicates removed.`);
        refresh();
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to rebuild resolved items');
      }
    } catch {
      setStatus('error');
      setStatusMessage('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Actions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage this bundle&apos;s lifecycle.</p>
      </div>

      {bundle.publish_status === 'published' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
          <div className="text-sm font-medium text-amber-800 dark:text-amber-300">Editing published content may affect assigned colleges/students.</div>
        </div>
      )}

      {status !== 'idle' && (
        <div className={status === 'success'
          ? 'bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2'
          : 'bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2'
        }>
          <div className="flex items-center gap-2">
            {status === 'success' ? (
              <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 text-destructive" />
            )}
            <p className={status === 'success'
              ? 'text-sm text-emerald-700 dark:text-emerald-300 font-medium'
              : 'text-sm text-destructive font-medium'
            }>
              {statusMessage}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {bundle.publish_status !== 'published' ? (
          <Button onClick={handlePublish} disabled={isProcessing} size="sm">
            {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
            <FileCheck className="mr-2 size-4" />
            Publish
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleUnpublish}
            disabled={isProcessing}
            size="sm"
          >
            {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
            <FileX className="mr-2 size-4" />
            Unpublish
          </Button>
        )}

        <Button variant="outline" onClick={handleClone} disabled={isProcessing} size="sm">
          {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
          <Copy className="mr-2 size-4" />
          Clone
        </Button>

        <Button variant="outline" onClick={handleRebuildResolved} disabled={isProcessing} size="sm">
          {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
          <RefreshCw className="mr-2 size-4" />
          Rebuild
        </Button>

        <Button
          variant="destructive"
          onClick={handleDeleteClick}
          disabled={isProcessing}
          size="sm"
        >
          {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
          <Trash2 className="mr-2 size-4" />
          Delete
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bundle and cancel all associated orders. All student access will be revoked. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
