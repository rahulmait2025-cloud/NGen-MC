'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  removeTeamPageHeroImageAction,
  uploadTeamPageHeroImageAction,
} from '@/app/(app)/team/settings/actions';
import { getTeamMemberPhotoPublicUrl } from '@/lib/superadmin/team-members/photo-url';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

interface TeamHeroImageUploadProps {
  heroImagePath: string | null;
  onHeroImagePathChange: (path: string | null) => void;
  altText: string;
  disabled?: boolean;
}

export function TeamHeroImageUpload({
  heroImagePath,
  onHeroImagePathChange,
  altText,
  disabled = false,
}: TeamHeroImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentUrl = previewUrl ?? getTeamMemberPhotoPublicUrl(heroImagePath);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.set('photo', file);

    startTransition(async () => {
      const result = await uploadTeamPageHeroImageAction(formData);
      if (result.success && result.data) {
        toast.success('Hero photo uploaded.');
        onHeroImagePathChange(result.data.heroImagePath);
      } else {
        toast.error(result.error ?? 'Upload failed.');
      }
      setPreviewUrl(null);
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeTeamPageHeroImageAction();
      if (result.success) {
        toast.success('Hero photo removed.');
        if (result.warning) toast.warning(result.warning);
        onHeroImagePathChange(null);
        setPreviewUrl(null);
      } else {
        toast.error(result.error ?? 'Failed to remove photo.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-[5/4] w-full max-w-56 shrink-0 overflow-hidden rounded-xl border bg-muted sm:w-56">
          {currentUrl ? (
            <Image
              src={currentUrl}
              alt={altText || 'Team hero photo'}
              fill
              className="object-cover"
              sizes="224px"
            />
          ) : (
            <div className="flex size-full items-center justify-center px-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              No hero photo set
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <p className="text-sm text-muted-foreground">
            Recommended: landscape group photo, roughly 5:4 ratio, at least
            1200 × 960 px. JPG, PNG, or WebP. Maximum file size: 5 MB. Keep faces
            away from the edges so overlaid labels don&apos;t cover them.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              disabled={disabled || isPending}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || isPending}
              onClick={() => inputRef.current?.click()}
            >
              {isPending
                ? 'Working…'
                : heroImagePath
                  ? 'Replace photo'
                  : 'Upload photo'}
            </Button>
            {heroImagePath ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isPending}
                onClick={handleRemove}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            When set, this group photo takes priority over the automatic member
            collage in the public hero.
          </p>
        </div>
      </div>
    </div>
  );
}
