'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  removeTeamMemberPhotoAction,
  uploadTeamMemberPhotoAction,
} from '@/app/(app)/team/actions';
import { getTeamMemberPhotoPublicUrl } from '@/lib/superadmin/team-members/photo-url';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface TeamImageUploadProps {
  memberId?: string;
  memberName: string;
  photoPath: string | null;
  altText: string;
  onAltTextChange: (value: string) => void;
  disabled?: boolean;
}

export function TeamImageUpload({
  memberId,
  memberName,
  photoPath,
  altText,
  onAltTextChange,
  disabled = false,
}: TeamImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentUrl = previewUrl ?? getTeamMemberPhotoPublicUrl(photoPath);
  const canUpload = Boolean(memberId) && !disabled;

  const handleFileChange = (file: File | null) => {
    if (!file || !memberId) return;

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
      const result = await uploadTeamMemberPhotoAction(memberId, formData);
      if (result.success) {
        toast.success('Profile photo uploaded.');
        setPreviewUrl(null);
      } else {
        toast.error(result.error ?? 'Upload failed.');
        setPreviewUrl(null);
      }
    });
  };

  const handleRemove = () => {
    if (!memberId) return;
    startTransition(async () => {
      const result = await removeTeamMemberPhotoAction(memberId);
      if (result.success) {
        toast.success('Profile photo removed.');
        setPreviewUrl(null);
      } else {
        toast.error(result.error ?? 'Failed to remove photo.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border bg-muted">
          {currentUrl ? (
            <Image
              src={currentUrl}
              alt={altText || `Portrait of ${memberName}`}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xl font-semibold text-muted-foreground">
              {getInitials(memberName || '?')}
            </div>
          )}
        </div>

        <div className="space-y-3 flex-1">
          <p className="text-sm text-muted-foreground">
            Recommended: square portrait, at least 800 × 800 px, JPG, PNG, or WebP.
            Maximum file size: 5 MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              disabled={!canUpload || isPending}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canUpload || isPending}
              onClick={() => inputRef.current?.click()}
            >
              {isPending ? 'Uploading…' : photoPath ? 'Replace photo' : 'Upload photo'}
            </Button>
            {photoPath && canUpload ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleRemove}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
          {!memberId ? (
            <p className="text-xs text-muted-foreground">
              Save the team member first, then upload a profile photo.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo_alt_text">Alt text</Label>
        <Input
          id="photo_alt_text"
          name="photo_alt_text"
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          placeholder={`Portrait of ${memberName || 'team member'}`}
        />
      </div>
    </div>
  );
}
