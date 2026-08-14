'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { saveLessonNoteAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/[courseId]/lessons/[itemId]/engagement-actions';
import type { StudentLessonNotesRow } from '@/types/database';

interface LessonNotesCardProps {
  collegeSlug: string;
  courseId: string;
  itemId: string;
  initialNote: StudentLessonNotesRow | null;
}

const MAX_CHARS = 10000;

export function LessonNotesCard({ collegeSlug, courseId, itemId, initialNote }: LessonNotesCardProps) {
  const [body, setBody] = useState(initialNote?.body || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(initialNote ? new Date(initialNote.updated_at) : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBody(initialNote?.body || '');
    setLastSaved(initialNote ? new Date(initialNote.updated_at) : null);
    setError(null);
  }, [initialNote, itemId]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await saveLessonNoteAction({
        collegeSlug,
        courseId,
        itemId,
        body
      });

      if (res.success) {
        setLastSaved(new Date());
      } else {
        setError(res.error || 'Failed to save note');
      }
    } catch (err) {
      console.error('[LessonNotesCard] Save error:', err);
      setError('Could not save your note. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Capture key takeaways. Your notes are private to you.
        </p>
        {lastSaved && !error && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
            <CheckCircle2 className="size-2.5" />
            Saved
          </Badge>
        )}
      </div>

      <div className="relative">
        <Textarea
          placeholder="Start typing your notes here..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[180px] rounded-md border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed focus-visible:bg-background dark:bg-input/30 dark:text-foreground dark:placeholder:text-muted-foreground"
          maxLength={MAX_CHARS}
        />
        <div className="absolute bottom-1.5 right-2 text-[10px] tabular-nums text-muted-foreground/50">
          {body.length} / {MAX_CHARS}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
          {lastSaved ? `Synced ${lastSaved.toLocaleTimeString()}` : 'Not saved'}
        </span>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || (body === initialNote?.body && lastSaved !== null)}
          size="sm"
          className="h-8 gap-1.5 rounded-md px-4"
        >
          {isSaving ? <div className="animate-spin"><Loader2 className="size-3.5" /></div> : null}
          Save
        </Button>
      </div>
    </div>
  );
}
