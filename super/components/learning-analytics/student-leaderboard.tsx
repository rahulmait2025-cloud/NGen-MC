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
import { Award, Medal, Trophy } from 'lucide-react';
import type { LearningAnalyticsLeaderboardRow } from '@/lib/superadmin/learning-analytics/types';
import { formatActivityDate, formatPercent, formatWatchHours } from './format-display';

const TOP_ICONS: Record<number, React.ReactNode> = {
  1: <Trophy className="size-4 text-amber-500" />,
  2: <Medal className="size-4 text-muted-foreground" />,
  3: <Award className="size-4 text-amber-700/60" />,
};

export function StudentLeaderboard({
  collegeId,
  rows,
}: {
  collegeId: string;
  rows: LearningAnalyticsLeaderboardRow[];
}) {
  return (
    <BentoCard>
      <div className="border-b border-border px-8 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Student leaderboard
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Ranked by total watch time</p>
      </div>
      <div className="overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-border">
              <TableHead className="w-14">Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Lectures</TableHead>
              <TableHead className="text-right">Done</TableHead>
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
                <TableCell>
                  <span className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-muted-foreground">
                    {TOP_ICONS[row.rank] ?? (
                      <span className="text-xs text-muted-foreground">#{row.rank}</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="hidden max-w-[180px] truncate text-sm text-muted-foreground md:table-cell">
                  {row.email || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatWatchHours(row.totalWatchHours)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.lecturesWatched}</TableCell>
                <TableCell className="text-right tabular-nums">{row.completedLectures}</TableCell>
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
