'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Clock,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import type { ApplicantLearningSnapshot } from '@/lib/superadmin/jobs/applicant-analytics';

interface ApplicantLearningSnapshotProps {
  snapshot: ApplicantLearningSnapshot;
}

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 0.01) return '< 0.01 hrs';
  return `${hours.toFixed(1)} hrs`;
}

export function ApplicantLearningSnapshotCard({ snapshot }: ApplicantLearningSnapshotProps) {
  if (snapshot.error && !snapshot.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learning & Activity Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{snapshot.error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot.available && snapshot.freePlaylistCompletions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learning & Activity Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {snapshot.isGlobal
              ? 'Learning analytics not available yet for this student type. Free playlist activity will appear here once available.'
              : 'No learning activity recorded for this student yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = snapshot.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Learning & Activity Snapshot</h3>
        {snapshot.analyticsRoute && (
          <Button variant="outline" size="sm" asChild>
            <Link href={snapshot.analyticsRoute}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Full Analytics
            </Link>
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{formatHours(totals.totalWatchSeconds)}</p>
              <p className="text-xs text-muted-foreground">Watch Hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <BookOpen className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{totals.lecturesWatched}</p>
              <p className="text-xs text-muted-foreground">Lectures Watched</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{totals.completedLectures}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{totals.averageCompletionPercentage.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Avg Completion</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Free Playlist Completions */}
      {snapshot.freePlaylistCompletions > 0 && (
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Youtube className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">{snapshot.freePlaylistCompletions} free playlist videos completed</p>
              <p className="text-xs text-muted-foreground">YouTube self-learning activity</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Watched Videos */}
      {snapshot.watchedVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Watched Videos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Watched</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.watchedVideos.map((v) => (
                  <TableRow key={v.itemId}>
                    <TableCell className="max-w-[200px] truncate text-sm font-medium">
                      {v.videoTitle}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                      {v.courseTitle}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatHours(v.watchedSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <Badge
                        variant={v.completed ? 'default' : 'secondary'}
                        className={v.completed ? 'bg-green-100 text-green-800' : ''}
                      >
                        {v.completionPercentage.toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Module Breakdown */}
      {snapshot.moduleBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Course Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Videos</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.moduleBreakdown.map((m) => (
                  <TableRow key={m.moduleId}>
                    <TableCell className="max-w-[150px] truncate text-sm font-medium">
                      {m.moduleTitle}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                      {m.courseTitle}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.completedVideos}/{m.totalVideos}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatHours(m.totalWatchSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.averageCompletionPercentage.toFixed(0)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Last Active */}
      {snapshot.lastActivityAt && (
        <p className="text-xs text-muted-foreground">
          Last active: {new Date(snapshot.lastActivityAt).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
