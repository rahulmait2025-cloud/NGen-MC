'use client';

import { useCallback, useRef, useTransition } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  uploadPaidProductImageAction,
  type PaidCourseImageTarget,
  type PaidProductImageSourceType,
} from '@/app/(app)/master-courses/paid-landing-image-actions';

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

interface PaidCourseImageUploadProps {
  sourceType: PaidProductImageSourceType;
  sourceId: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  onUploaded: (patch: { cover_image_url?: string; thumbnail_url?: string }) => void;
}

function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) return 'Image must be under 2 MB';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed';
  }
  return null;
}

function ImagePreview({ url, label }: { url: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

export function PaidCourseImageUpload({
  sourceType,
  sourceId,
  coverUrl,
  thumbnailUrl,
  onUploaded,
}: PaidCourseImageUploadProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const bothInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleUpload = useCallback(
    (target: PaidCourseImageTarget, file: File | undefined) => {
      if (!file) return;
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      startTransition(async () => {
        const result = await uploadPaidProductImageAction(sourceType, sourceId, target, file);
        if (!result.ok) {
          toast.error(result.error ?? 'Upload failed');
          return;
        }
        toast.success('Image uploaded');
        onUploaded(result.data ?? {});
      });
    },
    [sourceType, sourceId, onUploaded],
  );

  return (
    <div className="md:col-span-2 space-y-4 rounded-lg border border-dashed p-4 bg-muted/20">
      <div>
        <Label className="text-sm font-semibold">Upload images</Label>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, or WebP — max 2 MB. Recommended 1280×720. URL fields below still work for manual links.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => coverInputRef.current?.click()}
        >
          {isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 size-3.5" />}
          Upload cover
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => thumbInputRef.current?.click()}
        >
          {isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 size-3.5" />}
          Upload thumbnail
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => bothInputRef.current?.click()}
        >
          {isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 size-3.5" />}
          Use same image for both
        </Button>
      </div>

      {(coverUrl || thumbnailUrl) && (
        <div className="flex flex-wrap gap-6">
          {coverUrl ? <ImagePreview url={coverUrl} label="Cover preview" /> : null}
          {thumbnailUrl && thumbnailUrl !== coverUrl ? (
            <ImagePreview url={thumbnailUrl} label="Thumbnail preview" />
          ) : null}
        </div>
      )}

      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleUpload('cover', e.target.files?.[0]);
          e.target.value = '';
        }}
        aria-label="Upload cover image"
      />
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleUpload('thumbnail', e.target.files?.[0]);
          e.target.value = '';
        }}
        aria-label="Upload thumbnail image"
      />
      <input
        ref={bothInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleUpload('both', e.target.files?.[0]);
          e.target.value = '';
        }}
        aria-label="Upload cover and thumbnail images"
      />
    </div>
  );
}
