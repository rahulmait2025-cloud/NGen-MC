import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BentoCard } from './bento-card';
import type { LearningAnalyticsCollegeRow } from '@/lib/superadmin/learning-analytics/types';
import { formatActivityDate, formatPercent, formatWatchHours } from './format-display';

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[hsl(25,95%,53%)] transition-[width] duration-300 ease-out"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{label}</span>
    </div>
  );
}

export function CollegeAnalyticsTable({ rows }: { rows: LearningAnalyticsCollegeRow[] }) {
  return (
    <BentoCard>
      <div className="border-b border-border px-8 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          College-wise analytics
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Video learning metrics by partner college
        </p>
      </div>
      <div className="overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-border">
              <TableHead className="sticky left-0 z-10 bg-card">College</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Watch hours</TableHead>
              <TableHead className="text-right">Lectures</TableHead>
              <TableHead className="text-right">Done</TableHead>
              <TableHead className="text-right">Avg %</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.collegeId}
                className="border-b-border/60 transition-colors hover:bg-muted/50"
              >
                <TableCell className="sticky left-0 z-10 max-w-[200px] truncate bg-card font-medium group-hover:bg-muted/50">
                  <Link
                    href={`/learning-analytics/${row.collegeId}`}
                    className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    {row.collegeName}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.totalStudents}</TableCell>
                <TableCell className="text-right tabular-nums text-[hsl(25,95%,53%)] font-semibold">
                  {row.activeLearningStudents}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWatchHours(row.totalWatchHours)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.lecturesWatched}</TableCell>
                <TableCell className="text-right tabular-nums">{row.completedLectures}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.averageCompletionPercentage)}
                </TableCell>
                <TableCell>
                  <ProgressBar pct={row.averageCompletionPercentage} label={formatPercent(row.averageCompletionPercentage)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatActivityDate(row.lastActivityAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-full border-border text-xs font-medium text-muted-foreground transition-[border-color,color] duration-150 hover:border-border hover:text-foreground"
                  >
                    <Link href={`/learning-analytics/${row.collegeId}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </BentoCard>
  );
}
