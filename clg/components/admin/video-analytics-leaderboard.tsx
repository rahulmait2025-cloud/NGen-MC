'use client';

import { useMemo } from 'react';
import { Trophy, Medal, Info, ChevronRight } from 'lucide-react';
import { useVideoAnalyticsDrilldown } from '@/components/admin/video-analytics-drilldown-provider';
import { BentoCard, BentoCardBody } from '@/components/admin/bento-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CollegeStudentLeaderboardEntry } from '@/lib/services/college-video-analytics';

const LEADERBOARD_NOTE =
  'Rankings use verified watch progress, not just opening or skipping videos. Click a student to see full stats.';

function formatLastActive(iso: string | null): string {
  if (!iso) {
    return 'Never';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Never';
  }
  return date.toLocaleDateString();
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/25">
        #1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-full text-xs font-bold bg-muted text-foreground border border-border/60">
        #2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
        #3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-full text-xs font-mono font-medium text-muted-foreground bg-muted/40">
      #{rank}
    </span>
  );
}

function topRowClassName(rank: number): string {
  if (rank === 1) {
    return 'bg-primary/[0.06] border-l-2 border-l-primary';
  }
  if (rank === 2) {
    return 'bg-muted/30 border-l-2 border-l-border';
  }
  if (rank === 3) {
    return 'bg-amber-500/[0.06] border-l-2 border-l-amber-500/40';
  }
  return '';
}

interface TopStudentCardProps {
  entry: CollegeStudentLeaderboardEntry;
  onSelect: (studentId: string) => void;
}

function TopStudentCard({ entry, onSelect }: TopStudentCardProps) {
  const accent =
    entry.rank === 1
      ? 'border-primary/30 bg-primary/[0.04]'
      : entry.rank === 2
        ? 'border-border/50 bg-muted/20'
        : 'border-amber-500/30 bg-amber-500/[0.04]';

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.studentId)}
      className={cn(
        'rounded-xl border p-4 flex flex-col gap-3 min-w-[200px] flex-1 text-left',
        'hover:border-primary/40 hover:shadow-md transition-[border-color,box-shadow]',
        accent,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <RankBadge rank={entry.rank} />
        {entry.rank === 1 && <Medal className="size-4 text-primary shrink-0" />}
        {entry.rank === 2 && <Medal className="size-4 text-muted-foreground shrink-0" />}
        {entry.rank === 3 && <Medal className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground truncate">{entry.studentName ?? 'Unknown'}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.studentEmail ?? '-'}</p>
      </div>
      <p className="text-xs text-primary font-medium flex items-center gap-1">
        View full stats
        <ChevronRight className="size-3.5" />
      </p>
    </button>
  );
}

export interface VideoAnalyticsLeaderboardProps {
  leaderboard: CollegeStudentLeaderboardEntry[];
  /** Compact table: rank, student, hours - details in popup only */
  compact?: boolean;
}

export function VideoAnalyticsLeaderboard({
  leaderboard,
  compact = false,
}: VideoAnalyticsLeaderboardProps) {
  const { openStudentDetail } = useVideoAnalyticsDrilldown();
  const topThree = useMemo(() => leaderboard.filter((entry) => entry.rank <= 3), [leaderboard]);
  const isEmpty = leaderboard.length === 0;

  return (
    <BentoCard className="overflow-hidden">
      <BentoCardBody className="!p-0">
        <div className="px-6 py-4 border-b border-border/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
              <Trophy className="size-4 text-primary" />
              {compact ? 'Rankings' : 'Student leaderboard'}
            </h3>
            {!isEmpty && (
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold uppercase tracking-wide w-fit"
              >
                {leaderboard.length} ranked
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
            <Info className="size-3.5 shrink-0 mt-0.5 opacity-70" />
            {LEADERBOARD_NOTE}
          </p>
        </div>

        {isEmpty ? (
          <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Trophy className="size-8 opacity-20" />
            <p>No leaderboard data yet.</p>
            <p className="text-xs max-w-sm">
              Rankings will appear once students reach verified watch progress on lectures.
            </p>
          </div>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            {topThree.length > 0 && (
              <div className="flex flex-col lg:flex-row gap-3">
                {topThree.map((entry) => (
                  <TopStudentCard
                    key={entry.studentId}
                    entry={entry}
                    onSelect={openStudentDetail}
                  />
                ))}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/10 hover:bg-transparent bg-muted/20">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider pl-6 w-20">
                      Rank
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[160px]">
                      Student
                    </TableHead>
                    {!compact && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[140px]">
                        Email
                      </TableHead>
                    )}
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                      Hours watched
                    </TableHead>
                    {!compact && (
                      <>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Lectures
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Completed
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Completion %
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Last active
                        </TableHead>
                      </>
                    )}
                    <TableHead className="w-10 pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow
                      key={entry.studentId}
                      role="button"
                      tabIndex={0}
                      onClick={() => openStudentDetail(entry.studentId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openStudentDetail(entry.studentId);
                        }
                      }}
                      className={cn(
                        'border-border/10 hover:bg-primary/[0.04] transition-colors cursor-pointer',
                        topRowClassName(entry.rank),
                      )}
                    >
                      <TableCell className="pl-6 py-3">
                        <RankBadge rank={entry.rank} />
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="font-semibold text-foreground whitespace-nowrap">
                          {entry.studentName ?? 'Unknown'}
                        </p>
                        {compact && entry.studentEmail && (
                          <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {entry.studentEmail}
                          </p>
                        )}
                      </TableCell>
                      {!compact && (
                        <TableCell className="py-3 text-muted-foreground text-sm max-w-[200px] truncate">
                          {entry.studentEmail ?? '-'}
                        </TableCell>
                      )}
                      <TableCell className="py-3 text-right font-mono tabular-nums font-semibold">
                        {entry.totalWatchHours}h
                      </TableCell>
                      {!compact && (
                        <>
                          <TableCell className="py-3 text-right font-mono tabular-nums">
                            {entry.lecturesWatched}
                          </TableCell>
                          <TableCell className="py-3 text-right font-mono tabular-nums">
                            {entry.completedLectures}
                          </TableCell>
                          <TableCell className="py-3 text-right font-mono tabular-nums">
                            {Math.round(entry.averageCompletionPercentage)}%
                          </TableCell>
                          <TableCell
                            className="py-3 text-right text-muted-foreground text-xs whitespace-nowrap"
                            suppressHydrationWarning
                          >
                            {formatLastActive(entry.lastWatchedAt)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="py-3 pr-6 text-right">
                        <ChevronRight className="size-4 text-muted-foreground inline-block" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </BentoCardBody>
    </BentoCard>
  );
}
