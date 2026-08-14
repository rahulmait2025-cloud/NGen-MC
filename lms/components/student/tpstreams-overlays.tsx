'use client';

import { Loader2, RotateCcw, AlertCircle, Play, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayerLoadingOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/70"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin"><Loader2 className="size-7 text-white/80" /></div>
        <p className="text-xs font-medium text-white/60">
          Initializing player
        </p>
      </div>
    </div>
  );
}

export function PlayerErrorOverlay({
  error,
  onRefresh,
}: {
  error: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">Playback interrupted</h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{error}</p>
      </div>
      {onRefresh ? (
        <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2 rounded-md border-border bg-secondary text-foreground hover:bg-secondary hover:text-foreground">
          <RotateCcw className="size-3.5" />
          Refresh player
        </Button>
      ) : null}
    </div>
  );
}

export function TabSwitchOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/10">
        <EyeOff className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">Video paused</h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          You switched tabs. Please return to this tab to continue watching.
        </p>
      </div>
      <Button
        onClick={onResume}
        variant="outline"
        size="sm"
        className="gap-2 rounded-md border-border bg-secondary text-foreground hover:bg-secondary hover:text-foreground"
      >
        <Play className="size-3.5 fill-current" />
        Resume Playing
      </Button>
    </div>
  );
}

export function ResumeOverlay({
  initialPosition,
  onResume,
  onDismiss,
}: {
  initialPosition: number;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const timeLabel = formatTime(initialPosition);

  return (
    <div
      role="dialog"
      aria-label="Continue watching"
      aria-describedby="resume-overlay-desc"
      className={cn(
        'absolute bottom-5 left-1/2 z-30 w-[min(calc(100%-1.5rem),22rem)] -translate-x-1/2',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        'motion-reduce:animate-none motion-reduce:opacity-100',
      )}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/80 p-1.5 pl-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onResume}
          className={cn(
            'group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pr-2 pl-0.5 text-left',
            'outline-none transition-[background-color,transform] duration-150 ease-out',
            'hover:bg-muted/20 active:scale-[0.99]',
            'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'relative flex size-10 shrink-0 items-center justify-center rounded-full',
              'bg-primary text-primary-foreground',
              'shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_22%,transparent)]',
              'transition-transform duration-150 ease-out',
              'group-hover:scale-105 group-active:scale-95',
            )}
          >
            <Play className="size-4 translate-x-px fill-current" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tracking-tight text-foreground">
              Continue watching
            </span>
            <span
              id="resume-overlay-desc"
              className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="rounded-md bg-muted/10 px-1.5 py-0.5 font-medium tabular-nums text-foreground">
                {timeLabel}
              </span>
              <span className="truncate">Pick up where you left off</span>
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Start from beginning"
          title="Start from beginning"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            'text-muted-foreground transition-colors duration-150 ease-out',
            'hover:bg-muted/10 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border',
          )}
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
