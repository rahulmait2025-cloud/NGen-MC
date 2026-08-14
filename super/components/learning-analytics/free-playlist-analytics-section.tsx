'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Users,
  UserCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LearningAnalyticsBarChart } from '@/components/learning-analytics/learning-analytics-bar-chart';
import { BentoCard } from '@/components/learning-analytics/bento-card';
import { LearningEmptyState } from '@/components/learning-analytics/learning-empty-state';
import { LearningKpiGrid } from '@/components/learning-analytics/learning-kpi-grid';
import { formatActivityDate } from '@/components/learning-analytics/format-display';
import type {
  FreePlaylistAnalyticsOverview,
  FreePlaylistPlaylistRow,
} from '@/lib/superadmin/learning-analytics/types';

const PLAYLIST_THUMB_SIZES = {
  sm: 'size-10 rounded-lg',
  md: 'size-12 rounded-lg',
  lg: 'size-16 rounded-xl',
};

function PlaylistThumb({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div
      className={`shrink-0 border border-border/60 bg-muted/30 ${PLAYLIST_THUMB_SIZES[size]}`}
    />
  );
}

function CompletionBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  if (total === 0) return null;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

function EnrolledStudentsPanel({ playlist }: { playlist: FreePlaylistPlaylistRow }) {
  const students = playlist.enrolledStudents;
  const completedStudents = students.filter((s) => s.completedVideosCount > 0);
  const notYetCompleted = students.filter((s) => s.completedVideosCount === 0);

  return (
    <div className="border-t border-border/60 bg-muted/20 px-4 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Enrolled Students
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {students.length} total
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            {completedStudents.length} with completions
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-full border-2 border-muted-foreground/40" />
            {notYetCompleted.length} enrolled only
          </span>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          No enrolled students found for this playlist.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-b-border/60 hover:bg-transparent">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider">
                  Student
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider">
                  College
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider">
                  Enrolled
                </TableHead>
                <TableHead className="h-9 text-right text-[11px] font-semibold uppercase tracking-wider">
                  Videos Done
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider">
                  Last Activity
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((row) => {
                const isCompleted = row.completedVideosCount > 0;
                return (
                  <TableRow
                    key={row.studentId}
                    className="border-b-border/30 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {row.name}
                        </p>
                        {row.email ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {row.email}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">
                      {row.collegeName ?? '\u2014'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2.5 text-sm text-muted-foreground">
                      {formatActivityDate(row.enrolledAt)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums font-semibold">
                      {row.completedVideosCount > 0 ? (
                        <span className="text-foreground">{row.completedVideosCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2.5 text-sm text-muted-foreground">
                      {formatActivityDate(row.lastCompletionAt)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {isCompleted ? (
                        <Badge variant="outline" className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5">
                          <CheckCircle2 className="size-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5">
                          Enrolled
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PlaylistRow({ playlist }: { playlist: FreePlaylistPlaylistRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const lastActivity = playlist.lastCompletionAt ?? playlist.lastEnrollmentAt;
  const hasStudents = playlist.enrolledStudents.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-border/60 last:border-b-0">
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:gap-4 sm:px-6">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </div>

            <PlaylistThumb />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {playlist.playlistTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {playlist.playlistId}
              </p>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold tabular-nums text-foreground">
                {playlist.totalEnrollments}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                enrolled
              </p>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-sm font-bold tabular-nums text-foreground">
                {playlist.uniqueStudents}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                unique
              </p>
            </div>

            <div className="hidden text-right lg:block">
              <CompletionBar
                completed={playlist.totalCompletions}
                total={playlist.totalEnrollments}
              />
              <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                {playlist.totalCompletions} marked done
              </p>
            </div>

            <div className="hidden text-right xl:block">
              {playlist.completionsToday > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                  +{playlist.completionsToday}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">0</span>
              )}
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                today
              </p>
            </div>

            <div className="hidden whitespace-nowrap text-right xl:block">
              <p className="text-xs text-muted-foreground">
                {formatActivityDate(lastActivity)}
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="ml-auto shrink-0 rounded-full text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/learning-analytics/free-playlists/${encodeURIComponent(playlist.playlistId)}`}
              >
                Detail
              </Link>
            </Button>
          </div>
        </CollapsibleTrigger>

        {hasStudents && (
          <CollapsibleContent>
            <EnrolledStudentsPanel playlist={playlist} />
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

function PlaylistMobileCard({ playlist }: { playlist: FreePlaylistPlaylistRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const lastActivity = playlist.lastCompletionAt ?? playlist.lastEnrollmentAt;
  const hasStudents = playlist.enrolledStudents.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-border/60 last:border-b-0">
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-muted/40">
            <div className="mt-1 flex size-6 shrink-0 items-center justify-center text-muted-foreground">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </div>

            <PlaylistThumb size="lg" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-foreground">
                {playlist.playlistTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {playlist.playlistId}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {playlist.totalEnrollments}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Enrolled
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {playlist.totalCompletions}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Done
                  </p>
                </div>
                <div>
                  {playlist.completionsToday > 0 ? (
                    <p className="text-lg font-bold tabular-nums text-primary">
                      +{playlist.completionsToday}
                    </p>
                  ) : (
                    <p className="text-lg font-bold tabular-nums text-foreground">0</p>
                  )}
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Today
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <CompletionBar
                  completed={playlist.totalCompletions}
                  total={playlist.totalEnrollments}
                />
                <span className="text-xs text-muted-foreground">
                  {formatActivityDate(lastActivity)}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {hasStudents && (
          <CollapsibleContent>
            <EnrolledStudentsPanel playlist={playlist} />
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export function FreePlaylistAnalyticsSection({
  data,
}: {
  data: FreePlaylistAnalyticsOverview;
}) {
  const hasRows = data.enrollmentsByPlaylist.length > 0;

  return (
    <section className="space-y-8 border-t border-border/70 pt-10">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
          Free Playlist Analytics
        </h2>
        <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-muted-foreground">
          Enrollment and completion activity for free YouTube playlists. Click any playlist to
          view enrolled students and their progress.
        </p>
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
            value: data.totalUniqueStudents.toLocaleString('en-IN'),
            icon: UserCheck,
          },
          {
            title: 'Marked Done Today',
            value: data.completionsToday.toLocaleString('en-IN'),
            icon: CheckCircle2,
          },
          {
            title: 'Frequent Watchers',
            value: data.totalFrequentWatchers.toLocaleString('en-IN'),
            icon: TrendingUp,
          },
        ]}
      />

      {!hasRows ? (
        <LearningEmptyState
          title="No free playlist enrollments yet"
          description="Enrollments and mark-as-done activity will appear here once students use free YouTube playlists."
        />
      ) : (
        <>
          <BentoCard>
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Playlist Performance
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Enrollment and mark-as-done totals by free playlist. Click to expand student list.
              </p>
            </div>

            <div className="hidden border-b border-border/40 px-4 py-2.5 sm:px-6 lg:block">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="size-7" />
                <div className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Playlist
                  </p>
                </div>
                <div className="w-20 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Enrolled
                  </p>
                </div>
                <div className="w-16 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unique
                  </p>
                </div>
                <div className="w-32 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Completion
                  </p>
                </div>
                <div className="w-14 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Today
                  </p>
                </div>
                <div className="w-28 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Last Activity
                  </p>
                </div>
                <div className="w-16" />
              </div>
            </div>

            <div className="block lg:hidden">
              {data.enrollmentsByPlaylist.map((playlist) => (
                <PlaylistMobileCard
                  key={playlist.playlistId}
                  playlist={playlist}
                />
              ))}
            </div>

            <div className="hidden lg:block">
              {data.enrollmentsByPlaylist.map((playlist) => (
                <PlaylistRow key={playlist.playlistId} playlist={playlist} />
              ))}
            </div>
          </BentoCard>

          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
            <LearningAnalyticsBarChart
              title="Daily mark-as-done activity"
              data={data.dailyCompletionTrend.map((row) => ({
                label: row.label,
                completionCount: row.completionCount,
              }))}
              xKey="label"
              yKey="completionCount"
            />

            <BentoCard>
              <div className="border-b border-border px-8 py-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Top Active Playlists
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Most mark-as-done activity in the last 7 days
                </p>
              </div>
              <div className="space-y-3 p-6">
                {data.topActivePlaylists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No mark-as-done activity in the last 7 days.
                  </p>
                ) : (
                  data.topActivePlaylists.map((row, index) => (
                    <div
                      key={row.playlistId}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {index + 1}. {row.playlistTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.enrollmentCount} enrolled
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold tabular-nums text-primary">
                          {row.completionCount}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          marked done
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BentoCard>
          </div>

          {data.frequentWatchers.length > 0 ? (
            <BentoCard>
              <div className="border-b border-border px-8 py-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Frequent Watchers
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Students marking videos done on 3+ days in the last 14 days
                </p>
              </div>
              <div className="overflow-x-auto p-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                        Student
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                        College
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">
                        Active Days
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.frequentWatchers.map((row) => (
                      <TableRow
                        key={row.studentId}
                        className="border-b-border/40 transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="py-2.5">
                          <div>
                            <p className="font-medium text-foreground">{row.name}</p>
                            {row.email ? (
                              <p className="text-xs text-muted-foreground">{row.email}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-sm text-muted-foreground">
                          {row.collegeName ?? '\u2014'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums font-bold text-primary">
                          {row.activeDays}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </BentoCard>
          ) : null}
        </>
      )}
    </section>
  );
}
