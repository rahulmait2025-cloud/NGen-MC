import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, Youtube, Video } from 'lucide-react';
import type { FreeCourseAnalyticsDetail } from '@/lib/free-courses/free-course-analytics';

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
    </div>
  );
}

export function FreeCourseAnalyticsSection({
  analytics,
}: {
  analytics: FreeCourseAnalyticsDetail;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4" />
          Analytics
        </CardTitle>
        <CardDescription>Enrollment, progress, and lesson completion for this free course.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Enrollments" value={analytics.enrollmentCount} />
          <StatCard label="Active learners" value={analytics.activeLearnerCount} />
          <StatCard label="Completed learners" value={analytics.completedLearnerCount} />
          <StatCard label="Avg progress" value={`${analytics.averageProgressPercent}%`} />
          <StatCard label="Total lessons" value={analytics.totalLessons} />
          <StatCard
            label="YouTube lessons"
            value={
              <span className="inline-flex items-center gap-1">
                <Youtube className="size-4 text-muted-foreground" />
                {analytics.youtubeLessonCount}
              </span>
            }
          />
          <StatCard
            label="Premium lessons"
            value={
              <span className="inline-flex items-center gap-1">
                <Video className="size-4 text-muted-foreground" />
                {analytics.tpstreamsLessonCount}
              </span>
            }
          />
          <StatCard label="Completion events" value={analytics.completedLessonEvents} />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Lesson analytics</h3>
          {analytics.lessonAnalytics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published lessons yet.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="font-semibold">Lesson</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                    <TableHead className="text-right font-semibold">Completed</TableHead>
                    <TableHead className="text-right font-semibold">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.lessonAnalytics.map((row) => (
                    <TableRow key={row.itemId} className="hover:bg-muted/30">
                      <TableCell className="font-medium max-w-[320px] truncate" title={row.lessonTitle}>
                        {row.lessonTitle}
                      </TableCell>
                      <TableCell>
                        {row.source === 'youtube' ? (
                          <Badge variant="outline" className="gap-1 text-[10px] bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                            <Youtube className="size-3 text-red-600" />
                            YouTube
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                            <Video className="size-3 text-blue-600" />
                            Premium
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground font-medium">{row.completionCount}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{row.completionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Recent enrollments</h3>
            {analytics.recentEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrollments yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {analytics.recentEnrollments.map((row, i) => (
                  <li
                    key={`enroll-${i}-${row.enrolledAt}`}
                    className="flex justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {row.studentName ?? row.studentEmail ?? 'Student'}
                      </p>
                      {row.studentEmail && row.studentName && (
                        <p className="text-xs text-muted-foreground truncate">{row.studentEmail}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs text-muted-foreground">
                      <p>{row.progressPercent}%</p>
                      <p>{new Date(row.enrolledAt).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Recent completions</h3>
            {analytics.recentCompletions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lesson completions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {analytics.recentCompletions.map((row, i) => (
                  <li
                    key={`done-${i}-${row.completedAt}`}
                    className="flex justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {row.studentName ?? row.studentEmail ?? 'Student'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{row.lessonTitle}</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(row.completedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
