'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { updateStudentBio } from '@/lib/actions/profile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_CHARS = 200;

type BioSectionProps = {
  bio: string | null;
  collegeId: string;
  collegeSlug: string;
};

export function BioSection({ bio: initialBio, collegeId, collegeSlug }: BioSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(initialBio || '');
  const [saving, setSaving] = useState(false);

  const charCount = bio.length;
  const overLimit = charCount > MAX_CHARS;

  const handleSave = async () => {
    if (overLimit) return;
    setSaving(true);
    try {
      const result = await updateStudentBio(collegeId, bio.trim(), collegeSlug);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Bio updated');
        setIsEditing(false);
      }
    } catch {
      toast.error('Could not save bio. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBio(initialBio || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About Me</h2>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Bio
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || overLimit}
              className="h-8 gap-1 bg-amber-700 hover:bg-amber-800 text-white font-medium shadow-xs"
            >
              {saving ? (
                <div className="animate-spin"><Loader2 className="h-4 w-4" /></div>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short bio about yourself..."
            className={cn(
              'min-h-[120px] text-sm resize-none border-amber-700/30 bg-secondary/10 px-3 py-2 shadow-none focus-visible:border-amber-700 focus-visible:ring-1 focus-visible:ring-amber-700/20',
              overLimit && 'border-destructive focus-visible:border-destructive',
            )}
            disabled={saving}
          />
          <p className={cn(
            'text-xs text-right',
            overLimit ? 'text-destructive font-medium' : charCount > MAX_CHARS * 0.8 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
          )}>
            {charCount}/{MAX_CHARS} characters
          </p>
        </div>
      ) : bio ? (
        <div className="rounded-xl bg-secondary/15 border border-border/40 p-5">
          <p className="text-sm font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {bio}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full rounded-xl border border-dashed border-primary/20 bg-secondary/5 px-4 py-8 text-center text-sm text-muted-foreground hover:border-primary/40 hover:bg-secondary/10 hover:text-foreground transition-all duration-200"
        >
          Add a short bio about yourself to complete your profile
        </button>
      )}
    </div>
  );
}
