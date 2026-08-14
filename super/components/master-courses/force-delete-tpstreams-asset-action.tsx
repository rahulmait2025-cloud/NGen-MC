'use client';

import { useState, useEffect, useReducer, useRef } from 'react';
import { Trash2, Loader2, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  forceDeleteTpstreamsAssetAction, 
  getTpstreamsForceDeleteImpactAction 
} from '@/app/(app)/master-courses/actions';
import type { ReflectedFolder } from '@/lib/services/tpstreams-sync';
import type { TpstreamsForceDeleteImpact } from '@/lib/services/tpstreams-force-delete';

interface ForceDeleteTpstreamsAssetActionProps {
  folder: ReflectedFolder;
}

type ForceLoadingState = { isDeleting: boolean; isLoadingImpact: boolean };
type ForceLoadingAction =
  | { type: 'DELETE_START' }
  | { type: 'DELETE_END' }
  | { type: 'LOAD_IMPACT_START' }
  | { type: 'LOAD_IMPACT_END' };

function forceLoadingReducer(state: ForceLoadingState, action: ForceLoadingAction): ForceLoadingState {
  switch (action.type) {
    case 'DELETE_START': return { ...state, isDeleting: true };
    case 'DELETE_END': return { ...state, isDeleting: false };
    case 'LOAD_IMPACT_START': return { ...state, isLoadingImpact: true };
    case 'LOAD_IMPACT_END': return { ...state, isLoadingImpact: false };
  }
}

export function ForceDeleteTpstreamsAssetAction({ folder }: ForceDeleteTpstreamsAssetActionProps) {
  const [{ isDeleting, isLoadingImpact }, loadingDispatch] = useReducer(forceLoadingReducer, { isDeleting: false, isLoadingImpact: false });

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [impact, setImpact] = useState<TpstreamsForceDeleteImpact | null>(null);
  const prevOpen = useRef(open);
  if (!open && prevOpen.current) {
    setImpact(null);
    setConfirmation('');
  }
  prevOpen.current = open;

  useEffect(() => {
    async function loadImpact() {
      loadingDispatch({ type: 'LOAD_IMPACT_START' });
      try {
        const result = await getTpstreamsForceDeleteImpactAction(folder.tp_folder_uuid);
        if (result.ok && result.data) {
          setImpact(result.data);
        } else {
          toast.error(result.error || 'Failed to load deletion impact');
        }
      } catch {
        toast.error('Failed to load deletion impact');
      } finally {
        loadingDispatch({ type: 'LOAD_IMPACT_END' });
      }
    }

    if (open) {
      loadImpact();
    }
  }, [open, folder.tp_folder_uuid]);

  const isOrphan = impact?.type === 'orphan_folder';
  const requiredPhrase = isOrphan ? 'FORCE DELETE' : `FORCE DELETE ${folder.tp_folder_uuid}`;
  const isValid = confirmation === requiredPhrase;
  const canDelete = impact?.canForceDelete ?? false;

  async function handleDelete() {
    if (!isValid || !canDelete) return;

    loadingDispatch({ type: 'DELETE_START' });
    const formData = new FormData();
    formData.append('tpFolderAssetId', folder.tp_folder_uuid);
    formData.append('confirmation', confirmation);

    try {
      const result = await forceDeleteTpstreamsAssetAction(formData);
      if (result.ok) {
        toast.success(result.message || 'Folder force deleted');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to force delete folder');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      loadingDispatch({ type: 'DELETE_END' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-xl">
            <AlertTriangle className="size-6" />
            Force Delete TPStreams Asset?
          </DialogTitle>
          <DialogDescription className="text-destructive/80 font-medium">
            This action deletes the asset directly from TPStreams. It is irreversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg border">
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold text-lg">{folder.title}</p>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                {impact?.type?.replace('_', ' ') || folder.classification?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate">{folder.tp_folder_uuid}</p>
          </div>
          
          {isLoadingImpact ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-8 animate-spin mb-2" />
              <p className="text-sm">Calculating impact...</p>
            </div>
          ) : impact ? (
            <div className="space-y-4">
              {!impact.canForceDelete && (
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30 flex gap-3">
                  <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive">Deletion Blocked</p>
                    <p className="text-destructive/90">{impact.blockedReason}</p>
                  </div>
                </div>
              )}

              {impact.canForceDelete && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                    <Info className="size-4" />
                    Estimated Deletion Impact
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 text-xs">
                    <ImpactRow label="Linked Pillars" count={impact.linkedPillarCount} />
                    <ImpactRow label="Linked Courses" count={impact.linkedCourseCount} />
                    <ImpactRow label="Linked Modules" count={impact.linkedModuleCount} />
                    <ImpactRow label="Linked Videos" count={impact.linkedVideoCount} />
                    <ImpactRow label="Active B2B Assignments" count={impact.activeB2bAssignmentCount} highlight={impact.activeB2bAssignmentCount > 0} />
                    <ImpactRow label="Paid B2C History" count={impact.b2cPaidHistoryCount} highlight={impact.b2cPaidHistoryCount > 0} />
                  </div>
                  
                  <div className="pt-2 text-[11px] text-amber-800 dark:text-amber-500 italic leading-snug">
                    * DB records will be hidden/unlinked, not hard-deleted.
                    {impact.activeB2bAssignmentCount > 0 && " Active B2B student assignments will be revoked."}
                    {impact.b2cPaidHistoryCount > 0 && " Paid B2C entitlements and order history will be preserved."}
                  </div>
                </div>
              )}

              {impact.canForceDelete && (
                <div className="space-y-3 border-t pt-4">
                  <div className="text-sm font-medium">
                    Type <strong className="text-destructive font-mono select-all bg-destructive/5 px-1 rounded">{requiredPhrase}</strong> to confirm.
                  </div>
                  <Input
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder={requiredPhrase}
                    className="font-mono"
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={!isValid || isDeleting || !canDelete || isLoadingImpact}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Force Deleting...
              </>
            ) : (
              'Force Delete from TPStreams'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImpactRow({ label, count, highlight }: { label: string; count: number; highlight?: boolean }) {
  if (count === 0 && !highlight) return null;
  return (
    <>
      <div className="text-muted-foreground">{label}:</div>
      <div className={highlight ? "font-bold text-destructive" : "font-medium"}>{count}</div>
    </>
  );
}
