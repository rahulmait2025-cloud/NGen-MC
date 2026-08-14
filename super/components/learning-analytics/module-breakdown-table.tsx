import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BentoCard } from './bento-card';
import type { LearningAnalyticsModuleBreakdownRow } from '@/lib/superadmin/learning-analytics/types';
import { formatPercent, formatWatchHours } from './format-display';

export function ModuleBreakdownTable({
  rows,
  title = 'Module breakdown',
  subtitle = 'Video activity grouped by course module',
}: {
  rows: LearningAnalyticsModuleBreakdownRow[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <BentoCard>
      <div className="border-b border-border px-8 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-border">
              <TableHead>Course</TableHead>
              <TableHead>Module</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Watched</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Avg %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.moduleId}
                className="border-b-border/60 transition-colors hover:bg-muted/50"
              >
                <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">{row.courseTitle}</TableCell>
                <TableCell className="max-w-[160px] truncate font-medium">{row.moduleTitle}</TableCell>
                <TableCell className="text-right tabular-nums">{row.totalVideos}</TableCell>
                <TableCell className="text-right tabular-nums">{row.watchedVideos}</TableCell>
                <TableCell className="text-right tabular-nums">{row.completedVideos}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatWatchHours(row.totalWatchHours)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.averageCompletionPercentage)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </BentoCard>
  );
}
