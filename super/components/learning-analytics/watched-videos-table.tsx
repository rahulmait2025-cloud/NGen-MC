import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BentoCard } from './bento-card';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import type { LearningAnalyticsWatchedVideoRow } from '@/lib/superadmin/learning-analytics/types';
import { formatActivityDate, formatDurationSeconds, formatPercent } from './format-display';

export function WatchedVideosTable({ rows }: { rows: LearningAnalyticsWatchedVideoRow[] }) {
  return (
    <BentoCard>
      <div className="border-b border-border px-8 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Watched lectures
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Videos with recorded watch time</p>
      </div>
      <div className="overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-border">
              <TableHead>Course</TableHead>
              <TableHead className="hidden sm:table-cell">Module</TableHead>
              <TableHead>Video</TableHead>
              <TableHead className="text-right">Watched</TableHead>
              <TableHead className="text-right">Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden text-right md:table-cell">Position</TableHead>
              <TableHead className="hidden lg:table-cell">Last watched</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.itemId}
                className="border-b-border/60 transition-colors hover:bg-muted/50"
              >
                <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">{row.courseTitle}</TableCell>
                <TableCell className="hidden max-w-[140px] truncate text-sm text-muted-foreground sm:table-cell">
                  {row.moduleTitle}
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-medium">{row.videoTitle}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatDurationSeconds(row.watchedSeconds)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-10 rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-[hsl(25,95%,53%)]"
                        style={{ width: `${Math.min(row.completionPercentage, 100)}%` }}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">{formatPercent(row.completionPercentage)}</span>
                  </span>
                </TableCell>
                <TableCell>
                  {row.completed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(25,95%,53%)]">
                      <CheckCircle2 className="size-3.5" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <PlayCircle className="size-3.5" />
                      In progress
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                  {row.lastPositionSeconds != null
                    ? formatDurationSeconds(row.lastPositionSeconds)
                    : '—'}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                  {formatActivityDate(row.lastWatchedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </BentoCard>
  );
}
