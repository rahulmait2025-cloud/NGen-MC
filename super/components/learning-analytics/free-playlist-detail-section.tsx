import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BentoCard } from '@/components/learning-analytics/bento-card';
import { LearningEmptyState } from '@/components/learning-analytics/learning-empty-state';
import { LearningKpiGrid } from '@/components/learning-analytics/learning-kpi-grid';
import { formatActivityDate } from '@/components/learning-analytics/format-display';
import type { FreePlaylistAnalyticsDetail } from '@/lib/superadmin/learning-analytics/types';
import { CheckCircle2, Users, UserCheck, Youtube } from 'lucide-react';

export function FreePlaylistDetailSection({
  data,
}: {
  data: FreePlaylistAnalyticsDetail;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {data.playlistThumbnailUrl ? (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.playlistThumbnailUrl}
                alt=""
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/50">
              <Youtube className="size-8 text-red-500" aria-hidden />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {data.playlistTitle}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{data.playlistId}</p>
          </div>
        </div>
      </div>

      {data.loadError ? (
        <BentoCard>
          <div className="px-8 py-6 text-sm text-muted-foreground">{data.loadError}</div>
        </BentoCard>
      ) : null}

      <LearningKpiGrid
        items={[
          {
            title: 'Total Enrollments',
            value: data.totalEnrollments.toLocaleString('en-IN'),
            icon: Users,
          },
          {
            title: 'Unique Students',
            value: data.uniqueStudents.toLocaleString('en-IN'),
            icon: UserCheck,
          },
          {
            title: 'Total Marked Done',
            value: data.totalCompletions.toLocaleString('en-IN'),
            icon: CheckCircle2,
          },
          {
            title: 'Marked Done Today',
            value: data.completionsToday.toLocaleString('en-IN'),
            icon: CheckCircle2,
          },
        ]}
      />

      {data.enrolledStudents.length === 0 ? (
        <LearningEmptyState
          title="No enrolled students yet"
          description="Students who enroll in this free playlist will appear here."
        />
      ) : (
        <BentoCard>
          <div className="border-b border-border px-8 py-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Enrolled Students
            </h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Showing up to {data.enrolledStudents.length} most recent enrollments
            </p>
          </div>
          <div className="overflow-x-auto p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Enrolled At</TableHead>
                  <TableHead className="text-right">Marked Done</TableHead>
                  <TableHead>Last Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.enrolledStudents.map((row) => (
                  <TableRow key={`${row.studentId}-${row.enrolledAt}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{row.name}</p>
                        {row.email ? (
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.collegeName ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatActivityDate(row.enrolledAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {row.completedVideosCount}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatActivityDate(row.lastCompletionAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </BentoCard>
      )}
    </div>
  );
}
