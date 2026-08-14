'use client';

import * as React from 'react';
import { useRef, useReducer } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bookmark, StickyNote, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  createBookmarkAction,
  deleteBookmarkAction,
  saveLessonNoteAction,
} from '@/app/c/[collegeSlug]/student/(authenticated)/learn/[courseId]/lessons/[itemId]/engagement-actions';
import type { StudentLessonBookmarksRow, StudentLessonNotesRow } from '@/types/database';

export interface VideoActionBarProps {
  collegeSlug: string;
  courseId: string;
  itemId: string;
  currentTime: number;
  initialNote: StudentLessonNotesRow | null;
  bookmarks: StudentLessonBookmarksRow[];
  isVideoLesson: boolean;
  /** Seek the underlying video player to a bookmarked timestamp. */
  onSeek: (seconds: number) => void;
  /** Called after a bookmark is added/removed or note is saved — used to trigger parent revalidation. */
  onMutated?: () => void;
  className?: string;
}

type OpenPanel = 'bookmark' | 'note' | null;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Reducer for action bar state to reduce re-renders
type ActionBarAction =
  | { type: 'SET_OPEN'; panel: OpenPanel }
  | { type: 'SET_BOOKMARK_LABEL'; label: string }
  | { type: 'SET_BOOKMARK_BUSY'; busy: boolean }
  | { type: 'SET_NOTE_BODY'; body: string }
  | { type: 'SET_NOTE_BUSY'; busy: boolean }
  | { type: 'SET_NOTE_SAVED_AT'; date: Date | null }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_DELETE_BUSY'; id: string | null }
  | { type: 'RESET'; note: StudentLessonNotesRow | null };

interface ActionBarState {
  open: OpenPanel;
  bookmarkLabel: string;
  bookmarkBusy: boolean;
  noteBody: string;
  noteBusy: boolean;
  noteSavedAt: Date | null;
  error: string | null;
  deleteBusyId: string | null;
}

function actionBarReducer(state: ActionBarState, action: ActionBarAction): ActionBarState {
  switch (action.type) {
    case 'SET_OPEN':
      return { ...state, open: action.panel };
    case 'SET_BOOKMARK_LABEL':
      return { ...state, bookmarkLabel: action.label };
    case 'SET_BOOKMARK_BUSY':
      return { ...state, bookmarkBusy: action.busy };
    case 'SET_NOTE_BODY':
      return { ...state, noteBody: action.body };
    case 'SET_NOTE_BUSY':
      return { ...state, noteBusy: action.busy };
    case 'SET_NOTE_SAVED_AT':
      return { ...state, noteSavedAt: action.date };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_DELETE_BUSY':
      return { ...state, deleteBusyId: action.id };
    case 'RESET':
      return {
        ...state,
        open: null,
        bookmarkLabel: '',
        noteBody: action.note?.body ?? '',
        noteSavedAt: action.note ? new Date(action.note.updated_at) : null,
        error: null,
      };
    default:
      return state;
  }
}

/**
 * Floating action bar that overlays the video player.
 * Provides 1-tap access to "Bookmark this moment" and "Add a quick note"
 * — the two engagement actions students need mid-watch, without leaving the video.
 *
 * Design: Sits in the bottom-right of the video, above the player's own controls.
 * Activates a popover inline (not a modal) so context is preserved.
 */
export function VideoActionBar({
  collegeSlug,
  courseId,
  itemId,
  currentTime,
  initialNote,
  bookmarks,
  isVideoLesson,
  onSeek,
  onMutated,
  className,
}: VideoActionBarProps) {
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(actionBarReducer, initialNote, (note): ActionBarState => ({
    open: null,
    bookmarkLabel: '',
    bookmarkBusy: false,
    noteBody: note?.body ?? '',
    noteBusy: false,
    noteSavedAt: note ? new Date(note.updated_at) : null,
    error: null,
    deleteBusyId: null,
  }));

  // Reset transient state when the lesson changes.
  const prevItemId = useRef(itemId);
  if (itemId !== prevItemId.current) {
    prevItemId.current = itemId;
    dispatch({ type: 'RESET', note: initialNote });
  }

  // Close on Esc.
  React.useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'SET_OPEN', panel: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.open]);

  const handleAddBookmark = async () => {
    if (!state.bookmarkLabel.trim() || state.bookmarkBusy) return;
    dispatch({ type: 'SET_BOOKMARK_BUSY', busy: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const res = await createBookmarkAction({
        collegeSlug,
        courseId,
        itemId,
        timestampSeconds: isVideoLesson ? Math.floor(currentTime) : null,
        label: state.bookmarkLabel.trim(),
      });
      if (res.success) {
        dispatch({ type: 'SET_BOOKMARK_LABEL', label: '' });
        dispatch({ type: 'SET_OPEN', panel: null });
        onMutated?.();
      } else {
        dispatch({ type: 'SET_ERROR', error: res.error ?? 'Failed to add bookmark' });
      }
    } catch (err) {
      console.error('[VideoActionBar] bookmark error:', err);
      dispatch({ type: 'SET_ERROR', error: 'Failed to add bookmark' });
    } finally {
      dispatch({ type: 'SET_BOOKMARK_BUSY', busy: false });
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    if (state.deleteBusyId) return;
    dispatch({ type: 'SET_DELETE_BUSY', id });
    try {
      await deleteBookmarkAction({ collegeSlug, bookmarkId: id }, courseId, itemId);
      onMutated?.();
    } catch (err) {
      console.error('[VideoActionBar] delete bookmark error:', err);
    } finally {
      dispatch({ type: 'SET_DELETE_BUSY', id: null });
    }
  };

  const handleSaveNote = async () => {
    if (state.noteBusy) return;
    dispatch({ type: 'SET_NOTE_BUSY', busy: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const res = await saveLessonNoteAction({
        collegeSlug,
        courseId,
        itemId,
        body: state.noteBody,
      });
      if (res.success) {
        dispatch({ type: 'SET_NOTE_SAVED_AT', date: new Date() });
      } else {
        dispatch({ type: 'SET_ERROR', error: res.error ?? 'Failed to save note' });
      }
    } catch (err) {
      console.error('[VideoActionBar] save note error:', err);
      dispatch({ type: 'SET_ERROR', error: 'Failed to save note' });
    } finally {
      dispatch({ type: 'SET_NOTE_BUSY', busy: false });
    }
  };

  const handleSeekBookmark = (seconds: number) => {
    onSeek(seconds);
  };

  return (
    <LazyMotion features={domAnimation}>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-20 flex flex-col justify-end p-3 sm:p-4',
          className,
        )}
      >
        <div className="pointer-events-auto flex items-end justify-end gap-2">
          <AnimatePresence>
            {state.open ? (
              <m.div
                key="panel"
                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1], exit: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }}
                className="pointer-events-auto w-72 max-w-[78vw] overflow-hidden rounded-2xl border border-border bg-card/95 text-foreground shadow-2xl backdrop-blur-md sm:w-80"
                role="dialog"
                aria-label={state.open === 'bookmark' ? 'Add bookmark' : 'Quick note'}
              >
                {state.open === 'bookmark' ? (
                  <div className="p-3.5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        Add bookmark {isVideoLesson ? `@ ${formatTime(currentTime)}` : ''}
                      </p>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_OPEN', panel: null })}
                        className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground"
                        aria-label="Close"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <Input
                      autoFocus
                      placeholder="e.g., Where he explains the event loop"
                      value={state.bookmarkLabel}
                      onChange={(e) => dispatch({ type: 'SET_BOOKMARK_LABEL', label: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleAddBookmark();
                      }}
                      className="h-9 rounded-lg border-border bg-muted/5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:bg-muted/10"
                    />
                    <Button
                      type="button"
                      onClick={handleAddBookmark}
                      disabled={!state.bookmarkLabel.trim() || state.bookmarkBusy}
                      className="mt-2.5 h-9 w-full gap-1.5 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90"
                    >
                      {state.bookmarkBusy ? <div className="animate-spin"><Loader2 className="size-3.5" /></div> : <Bookmark className="size-3.5" />}
                      Save bookmark
                    </Button>

                    {/* Existing bookmarks list (compact) */}
                    {bookmarks.length > 0 ? (
                      <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-border/50 bg-muted/5 p-1.5">
                        {bookmarks.slice(0, 5).map((bm) => (
                          <div
                            key={bm.id}
                            className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/5"
                          >
                            {bm.timestamp_seconds !== null ? (
                              <button
                                type="button"
                                onClick={() => handleSeekBookmark(bm.timestamp_seconds!)}
                                className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary transition-colors hover:bg-primary hover:text-white"
                              >
                                {formatTime(bm.timestamp_seconds)}
                              </button>
                            ) : null}
                            <span className="min-w-0 flex-1 truncate text-foreground">{bm.label}</span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteBookmark(bm.id)}
                              disabled={state.deleteBusyId === bm.id}
                              className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                              aria-label={`Delete ${bm.label}`}
                            >
                              {state.deleteBusyId === bm.id ? (
                                <div className="animate-spin"><Loader2 className="size-3" /></div>
                              ) : (
                                <Trash2 className="size-3" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-3.5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Quick note
                      </p>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_OPEN', panel: null })}
                        className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground"
                        aria-label="Close"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <Textarea
                      autoFocus
                      placeholder="Capture a thought, question, or quote…"
                      value={state.noteBody}
                      onChange={(e) => dispatch({ type: 'SET_NOTE_BODY', body: e.target.value })}
                      className="min-h-[100px] rounded-lg border-border bg-muted/5 px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:bg-muted/10"
                      maxLength={10000}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {state.noteSavedAt
                          ? `Saved ${state.noteSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Not saved yet'}
                      </span>
                      <Button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={state.noteBusy}
                        className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        {state.noteBusy ? <div className="animate-spin"><Loader2 className="size-3" /></div> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {state.error ? (
                  <p className="border-t border-border/50 bg-destructive/15 px-3.5 py-2 text-xs text-destructive-foreground/90">
                    {state.error}
                  </p>
                ) : null}
              </m.div>
            ) : null}
          </AnimatePresence>

          {/* The two pill buttons */}
          <div className="flex items-center gap-2">
            <ActionPill
              icon={<Bookmark className="size-3.5" aria-hidden />}
              label="Bookmark"
              active={state.open === 'bookmark'}
              badge={bookmarks.length}
              onClick={() => dispatch({ type: 'SET_OPEN', panel: state.open === 'bookmark' ? null : 'bookmark' })}
              disabled={!isVideoLesson && bookmarks.length === 0}
            />
            <ActionPill
              icon={<StickyNote className="size-3.5" aria-hidden />}
              label="Note"
              active={state.open === 'note'}
              onClick={() => dispatch({ type: 'SET_OPEN', panel: state.open === 'note' ? null : 'note' })}
            />
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

interface ActionPillProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  disabled?: boolean;
}

function ActionPill({ icon, label, active, badge, onClick, disabled }: ActionPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'group inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold backdrop-blur-md transition',
        active
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
          : 'bg-background/55 text-foreground hover:bg-background/75',
        disabled && 'opacity-40',
      )}
    >
      {icon}
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 ? (
        <span
          className={cn(
            'ml-0.5 rounded-sm px-1 font-mono text-xs tabular-nums',
            active ? 'bg-white/20' : 'bg-white/20',
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// re-export so callers can import everything from one place if desired
