'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { runFullSyncAction } from '@/app/(app)/master-courses/actions';
import type { TpSyncStats } from '@/lib/services/tpstreams-sync';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function SyncTpStreamsButton({
  onSyncComplete
}: {
  onSyncComplete?: (unmatchedFolders: TpSyncStats['unmatchedFolderList']) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<TpSyncStats | null>(null);
  const { refresh } = useRouter();

  function handleSync() {
    startTransition(async () => {
      setResult(null);

      try {
        const response = await runFullSyncAction();
        if (response.ok && response.data) {
          setResult(response.data);
          toast.success(response.message || 'Sync completed successfully');
          if (onSyncComplete && response.data.unmatchedFolderList) {
            onSyncComplete(response.data.unmatchedFolderList);
          }
          refresh();
        } else {
          toast.error(response.error || 'Failed to sync with TPStreams');
        }
      } catch {
        toast.error('An unexpected error occurred during sync');
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-[background-color,color,transform] duration-160 active:scale-[0.98] shadow-sm"
        >
          <RefreshCw className="mr-2 size-4" />
          Sync with TPStreams
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-2 border-border/50 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-3 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <RefreshCw className={`size-6 ${isPending ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                Sync with TPStreams
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground">
                Reconcile local database records with remote storage assets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <Loader2 className="size-14 animate-spin text-primary opacity-80" />
              <div className="text-center space-y-1.5">
                <p className="text-sm font-black uppercase tracking-widest text-primary animate-pulse">Synchronizing</p>
                <p className="text-xs font-semibold text-muted-foreground max-w-[200px] mx-auto leading-normal">
                  Fetching remote folders and validating asset hierarchy...
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/[0.03] border-2 border-emerald-500/20 text-emerald-700 shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
                <span className="text-sm font-black uppercase tracking-widest">Operation Success</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border-2 border-border/40 shadow-sm group hover:border-primary/20 transition-[border-color]">
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 mb-1">Folders</p>
                  <p className="text-3xl font-black tracking-tighter text-foreground">{result.totalFolders}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold text-muted-foreground/70">
                    <span className="text-primary">{result.matchedFolders} matched</span>
                    <span>/</span>
                    <span>{result.unmatchedFolders} raw</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border-2 border-border/40 shadow-sm group hover:border-primary/20 transition-[border-color]">
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 mb-1">Assets</p>
                  <p className="text-3xl font-black tracking-tighter text-foreground">{result.totalAssets}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold text-muted-foreground/70">
                    <span className="text-primary">{result.matchedAssets} matched</span>
                    <span>/</span>
                    <span>{result.unmatchedAssets} raw</span>
                  </div>
                </div>
              </div>

              {(result.newLocalRows > 0 || result.updatedLocalRows > 0) && (
                <div className="p-4 rounded-xl bg-primary/[0.03] border-2 border-primary/20 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2.5">Database Delta</p>
                  <ul className="text-xs space-y-2 text-muted-foreground font-semibold">
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Created {result.newLocalRows} new video records
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Updated {result.updatedLocalRows} existing entries
                    </li>
                  </ul>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-destructive/[0.03] border-2 border-destructive/20 text-destructive shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Conflict Log
                  </p>
                  <ul className="text-[10px] font-semibold list-disc pl-4 space-y-1.5 opacity-80">
                    {result.errors.map((err: string) => (
                      <li key={err.slice(0, 64)}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted/30 p-5 rounded-xl border-2 border-border/40 shadow-inner">
              <p className="text-xs font-black uppercase tracking-widest text-foreground/70 mb-3">Synchronization Purpose</p>
              <ul className="text-xs space-y-3 text-muted-foreground font-semibold">
                <li className="flex items-start gap-2.5">
                  <div className="size-1.5 rounded-full bg-primary shrink-0 mt-1" />
                  <span>Detection of structural changes made directly in TPStreams.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="size-1.5 rounded-full bg-primary shrink-0 mt-1" />
                  <span>Update of video processing states and metadata durations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="size-1.5 rounded-full bg-primary shrink-0 mt-1" />
                  <span>Resolution of state drift between remote and local storage.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 pt-4 border-t border-border/50">
          {!result && (
            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending} className="font-semibold">
              Dismiss
            </Button>
          )}
          <Button 
            onClick={result ? () => setIsOpen(false) : handleSync} 
            disabled={isPending}
            className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-[background-color,transform] duration-160 active:scale-[0.98]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Syncing...
              </>
            ) : result ? (
              'Close Monitor'
            ) : (
              'Initiate Sync'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
