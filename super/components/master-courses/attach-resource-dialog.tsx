'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { linkExistingResourceToLessonAction } from '@/app/(app)/master-courses/[courseId]/course-resources-actions';
import type { CourseResourcesRow, MasterCourseItemsRow } from '@/types/database';

interface AttachResourceDialogProps {
  resources: CourseResourcesRow[];
  items: MasterCourseItemsRow[];
  courseId: string;
  onAttached?: () => void;
  children?: React.ReactNode;
}

export function AttachResourceDialog({
  resources,
  items,
  courseId: _courseId,
  onAttached,
  children,
}: AttachResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const videoItems = items.filter((item) => item.item_type === 'video');

  const reset = () => {
    setSelectedResourceId('');
    setSelectedItemId('');
  };

  const handleAttach = useCallback(() => {
    if (!selectedResourceId || !selectedItemId) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('resource_id', selectedResourceId);
        fd.append('item_id', selectedItemId);

        const res = await linkExistingResourceToLessonAction(fd);
        if (res.ok) {
          toast.success('Resource attached to video');
          setOpen(false);
          reset();
          onAttached?.();
          router.refresh();
        } else {
          toast.error(res.error ?? 'Failed to attach resource');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }, [selectedResourceId, selectedItemId, onAttached, router]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" variant="outline" className="h-8 text-[12px] font-medium">
            <Video className="mr-1.5 size-3.5" />
            Link to Video
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Resource to Video</DialogTitle>
          <DialogDescription>
            Attach an existing resource to a video lesson. Students will see this resource
            displayed below the video when they open that lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Select Resource *</Label>
            <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a resource" />
              </SelectTrigger>
              <SelectContent position="popper">
                {resources.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No resources available
                  </SelectItem>
                ) : (
                  resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title} ({r.resource_type === 'pdf' ? 'PDF' : r.resource_type === 'markdown' ? 'Note' : 'Link'})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Select Video *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a video" />
              </SelectTrigger>
              <SelectContent position="popper">
                {videoItems.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No videos in this module
                  </SelectItem>
                ) : (
                  videoItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedResourceId || !selectedItemId || isPending}
            onClick={handleAttach}
          >
            {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Attach Resource
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
