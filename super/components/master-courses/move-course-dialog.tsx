'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Move, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MasterCoursePillarStatsRow } from '@/types/database';
import { moveCourseToPillarAction } from '@/app/(app)/master-courses/actions';

interface MoveCourseDialogProps {
  courseId: string;
  courseTitle: string;
  currentPillarId: string;
  pillars: MasterCoursePillarStatsRow[];
}

export function MoveCourseDialog({
  courseId,
  courseTitle,
  currentPillarId,
  pillars,
}: MoveCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetPillarId, setTargetPillarId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const { refresh } = useRouter();

  const otherPillars = pillars.filter((p) => p.pillar_id !== currentPillarId);

  async function handleMove() {
    if (!targetPillarId || targetPillarId === currentPillarId) {
      toast.error('Please select a different pillar');
      return;
    }

    setIsMoving(true);
    try {
      const formData = new FormData();
      formData.append('course_id', courseId);
      formData.append('current_pillar_id', currentPillarId);
      formData.append('target_pillar_id', targetPillarId);

      const result = await moveCourseToPillarAction(formData);
      if (result.ok) {
        toast.success('Course moved successfully');
        setOpen(false);
        setTargetPillarId('');
        refresh();
      } else {
        toast.error(result.error ?? 'Failed to move course');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsMoving(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-auto px-2 py-1.5 text-muted-foreground"
        onClick={() => {
          setTargetPillarId('');
          setOpen(true);
        }}
      >
        <Move className="mr-2 size-4" />
        Move to Pillar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Move Course to Another Pillar</DialogTitle>
            <DialogDescription>
              Select a target pillar for &quot;{courseTitle}&quot;. This updates the
              SuperAdmin hierarchy only.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="target-pillar" className="text-sm font-medium block mb-2">Target Pillar</label>
            <Select value={targetPillarId} onValueChange={setTargetPillarId}>
              <SelectTrigger id="target-pillar">
                <SelectValue placeholder="Select a pillar" />
              </SelectTrigger>
              <SelectContent position="popper">
                {otherPillars.map((pillar) => (
                  <SelectItem key={pillar.pillar_id} value={pillar.pillar_id}>
                    <div className="flex items-center gap-2">
                      <span>{pillar.title}</span>
                      <span className="text-xs text-muted-foreground">
                        ({pillar.course_count} courses)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <strong>Note:</strong> This updates the SuperAdmin hierarchy. Existing
            TPStreams folder location will remain unchanged unless a future official
            move/sync flow is added.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isMoving}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!targetPillarId || isMoving}>
              {isMoving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 size-4" />
                  Move Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}