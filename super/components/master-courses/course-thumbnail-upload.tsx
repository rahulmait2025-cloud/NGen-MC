'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { uploadCourseThumbnailAction, deleteCourseThumbnailAction } from '@/app/(app)/master-courses/thumbnail-actions';

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

interface CourseThumbnailUploadProps {
  courseId: string;
  currentThumbnailUrl?: string | null;
  onUpdate?: (url: string) => void;
  onDelete?: () => void;
}

function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    return 'Image must be under 2 MB';
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Only JPG, PNG, and WebP images are allowed';
  }
  return null;
}

export function CourseThumbnailUpload({
  courseId,
  currentThumbnailUrl,
  onUpdate,
  onDelete,
}: CourseThumbnailUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentThumbnailUrl ?? null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      startTransition(async () => {
        try {
          const result = await uploadCourseThumbnailAction(courseId, file);
          if (result.ok) {
            toast.success('Thumbnail uploaded');
            const url = (result as { data?: { thumbnail_url?: string } }).data?.thumbnail_url;
            if (url) {
              setPreviewUrl(url);
              onUpdate?.(url);
            }
          } else {
            toast.error(result.error ?? 'Upload failed');
            setPreviewUrl(currentThumbnailUrl ?? null);
          }
        } catch {
          toast.error('Upload failed');
          setPreviewUrl(currentThumbnailUrl ?? null);
        }
      });
    },
    [courseId, currentThumbnailUrl, onUpdate],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDelete = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await deleteCourseThumbnailAction(courseId);
        if (result.ok) {
          toast.success('Thumbnail removed');
          setPreviewUrl(null);
          onDelete?.();
        } else {
          toast.error(result.error ?? 'Delete failed');
        }
      } catch {
        toast.error('Delete failed');
      }
    });
  }, [courseId, onDelete]);

  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-semibold text-foreground/80 ml-1">Course Thumbnail</Label>

      {previewUrl ? (
        <div className="relative group rounded-xl overflow-hidden border-2 border-border/40 bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Course thumbnail"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 px-4 text-xs font-semibold"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 size-3.5" />}
              Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-9 px-4 text-xs font-semibold"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Remove
            </Button>
          </div>
          {isPending && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border/40 bg-background hover:border-primary/40 hover:bg-muted/30',
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          role="button"
          tabIndex={0}
        >
          {isPending ? (
            <Loader2 className="size-8 text-primary animate-spin" />
          ) : (
            <ImagePlus className="size-8 text-muted-foreground/40" />
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground/70">
              {isDragOver ? 'Drop image here' : 'Click or drag to upload'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, or WebP — max 2 MB</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
        aria-label="Upload course thumbnail"
      />
    </div>
  );
}

// Re-export Label to avoid circular imports (used inline above)
import { Label } from '@/components/ui/label';
