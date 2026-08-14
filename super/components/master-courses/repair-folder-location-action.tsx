'use client';

import { useState } from 'react';
import { RefreshCw, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { repairTpFolderLocationAction } from '@/app/(app)/master-courses/actions';
import type { ReflectedFolder } from '@/lib/services/tpstreams-sync';

interface RepairFolderLocationActionProps {
  folder: ReflectedFolder;
}

export function RepairFolderLocationAction({ folder }: RepairFolderLocationActionProps) {
  const [open, setOpen] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  async function handleRepair() {
    setIsRepairing(true);
    const formData = new FormData();
    formData.append('tpFolderUuid', folder.tp_folder_uuid);

    try {
      const result = await repairTpFolderLocationAction(formData);
      if (result.ok) {
        toast.success(result.message || 'Folder location repaired');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to repair folder');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsRepairing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="w-full group/btn hover:bg-amber-600 hover:text-white border-amber-500/20 transition-[background-color,color,transform] duration-160 active:scale-[0.98]"
        >
          <RefreshCw className="size-4 mr-2" />
          Repair Location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="size-5" />
            Repair Folder Location?
          </DialogTitle>
          <DialogDescription>
            This folder is currently misplaced in TPStreams. We will move it to its correct parent folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-md space-y-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Folder</p>
              <p className="font-semibold">{folder.title}</p>
            </div>
            
            <div className="flex items-center gap-4 pt-2 border-t border-border/50">
               <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Current Parent</p>
                  <p className="text-sm font-mono">{folder.current_parent_uuid || 'Root'}</p>
               </div>
               <ArrowRight className="size-4 text-muted-foreground" />
               <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase">Correct Parent</p>
                  <p className="text-sm font-mono font-semibold text-amber-600">{folder.suggested_parent_uuid || 'Root'}</p>
               </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground italic">
            This action uses the TPStreams &quot;Move Asset&quot; API to re-parent the folder correctly within the hierarchy.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isRepairing}>
            Cancel
          </Button>
          <Button 
            className="bg-amber-600 hover:bg-amber-700 text-white border-none"
            onClick={handleRepair} 
            disabled={isRepairing}
          >
            {isRepairing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Repairing...
              </>
            ) : (
              'Repair Now'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
