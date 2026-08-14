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
import type { LearningAnalyticsStudentRow } from '@/lib/superadmin/learning-analytics/types';
import { formatActivityDate, formatPercent, formatWatchHours } from './format-display';

export function StudentAnalyticsTable({
  collegeId,
  rows,
}: {
  collegeId: string;
  rows: LearningAnalyticsStudentRow[];
}) {
  return (
    <BentoCard>
      <div className="border-b border-border px-8 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          All students
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Full student learning metrics</p>
      </div>
      <div className="overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-border">
              <TableHead>Student</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Lectures</TableHead>
              <TableHead className="text-right">Done</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Started</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Courses done</TableHead>
              <TableHead className="text-right">Avg %</TableHead>
              <TableHead className="hidden lg:table-cell">Last active</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.studentId}
                className="border-b-border/60 transition-colors hover:bg-muted/50"
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="hidden max-w-[180px] truncate text-sm text-muted-foreground md:table-cell">
                  {row.email || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatWatchHours(row.totalWatchHours)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.lecturesWatched}</TableCell>
                <TableCell className="text-right tabular-nums">{row.completedLectures}</TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {row.coursesStarted}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {row.coursesCompleted}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.averageCompletionPercentage)}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                  {formatActivityDate(row.lastActivityAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-full border-border text-xs font-medium text-muted-foreground transition-[border-color,color] duration-150 hover:border-border hover:text-foreground"
                  >
                    <Link href={`/learning-analytics/${collegeId}/students/${row.studentId}`}>
                      View
                    </Link>
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
