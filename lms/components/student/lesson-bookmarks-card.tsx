'use client';

import { useState, useEffect } from 'react';
import { Bookmark, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { createBookmarkAction, deleteBookmarkAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/[courseId]/lessons/[itemId]/engagement-actions';
import type { StudentLessonBookmarksRow } from '@/types/database';

interface LessonBookmarksCardProps {
  collegeSlug: string;
  courseId: string;
  itemId: string;
  bookmarks: StudentLessonBookmarksRow[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  isVideoLesson: boolean;
}

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function LessonBookmarksCard({ 
  collegeSlug, 
  courseId, 
  itemId, 
  bookmarks: initialBookmarks, 
  currentTime, 
  onSeek,
  isVideoLesson
}: LessonBookmarksCardProps) {
  const [bookmarks, setBookmarks] = useState<StudentLessonBookmarksRow[]>(initialBookmarks);
  const [label, setLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setBookmarks(initialBookmarks);
  }, [initialBookmarks, itemId]);

  const handleAdd = async () => {
    if (!label.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const res = await createBookmarkAction({
        collegeSlug,
        courseId,
        itemId,
        timestampSeconds: isVideoLesson ? Math.floor(currentTime) : null,
        label
      });
      if (res.success && res.data) {
        setBookmarks((prev) => [res.data!, ...prev].sort((a, b) => {
          const tA = a.timestamp_seconds ?? -1;
          const tB = b.timestamp_seconds ?? -1;
          if (tA !== tB) return tA - tB;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }));
        setLabel('');
      }
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await deleteBookmarkAction({ collegeSlug, bookmarkId: id }, courseId, itemId);
      if (res.success) {
        setBookmarks((prev) => prev.filter((bm) => bm.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-xs text-muted-foreground">
        Save important moments to revisit them later.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Bookmark className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="e.g., Important definition"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-9 pl-8 rounded-md border-border/60 bg-muted/20 text-sm focus-visible:bg-background"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <Button 
          onClick={handleAdd} 
          disabled={isAdding || !label.trim()}
          size="sm"
          className="h-9 shrink-0 gap-1.5 rounded-md px-3"
        >
          {isAdding ? <div className="animate-spin"><Loader2 className="size-3.5" /></div> : null}
          {isVideoLesson ? `Add @ ${formatTimestamp(currentTime)}` : 'Add'}
        </Button>
      </div>

      <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1 scrollbar-hide">
        {bookmarks.length === 0 ? (
          <EmptyState icon={<Bookmark />} title="No bookmarks yet" className="py-8" />
        ) : (
          bookmarks.map((bm) => (
            <div 
              key={bm.id}
              className="group flex items-center gap-2 rounded-md border border-border/50 bg-muted/10 px-2.5 py-1.5 transition-colors hover:bg-muted/30"
            >
              {bm.timestamp_seconds !== null ? (
                <button
                  type="button"
                  onClick={() => onSeek(bm.timestamp_seconds!)}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Play className="size-2.5 fill-current" />
                  {formatTimestamp(bm.timestamp_seconds)}
                </button>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{bm.label}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleDelete(bm.id)}
                disabled={deletingId === bm.id}
                className="size-6 shrink-0 rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label={`Delete bookmark ${bm.label}`}
              >
                {deletingId === bm.id ? <div className="animate-spin"><Loader2 className="size-3" /></div> : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
