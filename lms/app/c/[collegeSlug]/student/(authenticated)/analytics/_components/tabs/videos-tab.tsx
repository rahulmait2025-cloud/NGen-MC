'use client';

import React, { useMemo } from 'react';
import { Video, Target, Clock, Eye, BarChart2, Activity, Repeat, Timer, TrendingUp, Play } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { TransitionItem } from '@/components/student/page-transition';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TimeOfDayAnalytics, VideoWatchHistoryItem } from '@/lib/analytics/student-video-analytics-service';
import { KpiCard } from '../kpi-card';
import {
  INTERACTIVE_CHART_CONFIG,
  VIDEO_COMPLETION_CONFIG,
  WATCH_DEPTH_CONFIG,
  formatDuration,
  formatDate,
} from '../unified-analytics';

export function VideosTabContent({
  kpis,
  videoWatchHistory,
  timeOfDay: _timeOfDay,
}: {
  kpis: {
    totalWatchSeconds: number;
  };
  videoWatchHistory: VideoWatchHistoryItem[];
  timeOfDay: TimeOfDayAnalytics;
}) {
  const _useMinutes = kpis.totalWatchSeconds < 3600;

  const videoWatchTrendData = useMemo(() => {
    return videoWatchHistory.slice(0, 14).reverse().map((v) => ({
      label: v.lessonTitle.length > 20 ? v.lessonTitle.substring(0, 18) + '…' : v.lessonTitle,
      minutes: Math.round(v.watchedSeconds / 60),
    }));
  }, [videoWatchHistory]);

  const videoStats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let totalWatchSec = 0;
    let totalCompletion = 0;
    for (const v of videoWatchHistory) {
      if (v.completed) completed++;
      else if (v.watchedSeconds > 0) inProgress++;
      totalWatchSec += v.watchedSeconds;
      totalCompletion += v.completionPercentage;
    }
    const total = videoWatchHistory.length;
    const notStarted = total - completed - inProgress;
    const avgCompletion = total > 0 ? Math.round(totalCompletion / total) : 0;
    return { total, completed, inProgress, notStarted, totalWatchHours: Math.round((totalWatchSec / 3600) * 10) / 10, avgCompletion };
  }, [videoWatchHistory]);

  const watchDepthData = useMemo(() => {
    const buckets = { '0–25%': 0, '25–50%': 0, '50–75%': 0, '75–100%': 0 };
    videoWatchHistory.forEach(v => {
      const p = v.completionPercentage;
      if (p <= 25) buckets['0–25%']++;
      else if (p <= 50) buckets['25–50%']++;
      else if (p <= 75) buckets['50–75%']++;
      else buckets['75–100%']++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [videoWatchHistory]);

  const rewatchData = useMemo(() => {
    return videoWatchHistory
      .filter(v => v.watchedSeconds > v.durationSeconds * 1.1 && v.completed)
      .sort((a, b) => (b.watchedSeconds / b.durationSeconds) - (a.watchedSeconds / a.durationSeconds))
      .slice(0, 10)
      .map(v => ({
        title: v.lessonTitle.length > 28 ? v.lessonTitle.substring(0, 26) + '…' : v.lessonTitle,
        fullTitle: v.lessonTitle,
        course: v.courseTitle,
        ratio: Math.round((v.watchedSeconds / Math.max(v.durationSeconds, 1)) * 100),
        watchMinutes: Math.round(v.watchedSeconds / 60),
        durationMinutes: Math.round(v.durationSeconds / 60),
      }));
  }, [videoWatchHistory]);

  const dropoffData = useMemo(() => {
    const buckets = [
      { label: '0–25%', count: 0, fill: 'oklch(0.7 0.2 25)' },
      { label: '25–50%', count: 0, fill: 'oklch(0.75 0.18 55)' },
      { label: '50–75%', count: 0, fill: 'oklch(0.7 0.2 145)' },
      { label: '75–99%', count: 0, fill: 'oklch(0.65 0.22 160)' },
      { label: '100%', count: 0, fill: 'oklch(0.78 0.2 85)' },
    ];
    videoWatchHistory.forEach(v => {
      const p = v.completionPercentage;
      if (p < 25) buckets[0].count++;
      else if (p < 50) buckets[1].count++;
      else if (p < 75) buckets[2].count++;
      else if (p < 100) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [videoWatchHistory]);

  const videoSessionInsights = useMemo(() => {
    if (videoWatchHistory.length === 0) return null;
    const sessions = videoWatchHistory.map(v => v.watchedSeconds);
    const longestSession = Math.max(...sessions);
    const shortestSession = Math.min(...sessions);
    const median = sessions.sort((a, b) => a - b)[Math.floor(sessions.length / 2)];
    const completedCount = videoWatchHistory.filter(v => v.completed).length;
    const completionRate = Math.round((completedCount / videoWatchHistory.length) * 100);
    const totalWatchMin = Math.round(videoWatchHistory.reduce((s, v) => s + v.watchedSeconds, 0) / 60);
    return {
      longestSession: Math.round(longestSession / 60),
      shortestSession: Math.round(shortestSession / 60),
      medianSession: Math.round(median / 60),
      completionRate,
      totalWatchMin,
      uniqueCourses: new Set(videoWatchHistory.map(v => v.courseTitle)).size,
    };
  }, [videoWatchHistory]);

  return (
    <div className="space-y-8 mt-0 animate-in fade-in duration-300">
      <TransitionItem index={1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Video} label="Videos watched" value={videoStats.total} subtext="total videos" index={0} />
          <KpiCard icon={Target} label="Completion rate" value={videoStats.avgCompletion} suffix="%" subtext="avg completion" index={1} />
          <KpiCard icon={Clock} label="Total watch time" value={videoStats.totalWatchHours} suffix="h" subtext="of video content" index={2} />
          <KpiCard icon={Eye} label="Not started" value={videoStats.notStarted} subtext="videos remaining" index={3} />
        </div>
      </TransitionItem>

      <TransitionItem index={2}>
        <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
          <div><h2 className="text-sm font-semibold">Watch time trend</h2><p className="text-xs text-muted-foreground mt-0.5">Recent video watch duration</p></div>
          {videoWatchTrendData.length > 0 ? (
            <div className="h-[200px]">
              <ChartContainer config={INTERACTIVE_CHART_CONFIG} className="h-full w-full">
                <AreaChart data={videoWatchTrendData} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="watchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="minutes" stroke="var(--chart-1)" strokeWidth={2} fill="url(#watchGrad)" dot={false} />
                </AreaChart>
              </ChartContainer>
            </div>
          ) : (
            <Empty className="h-[200px]"><EmptyHeader><EmptyMedia variant="icon"><Video className="size-6" /></EmptyMedia><EmptyTitle>No watch data</EmptyTitle></EmptyHeader></Empty>
          )}
        </div>
      </TransitionItem>

      <TransitionItem index={3}>
        <div className="border border-border/60 bg-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-4"><h2 className="text-sm font-semibold">Watch history</h2></div>
          {videoWatchHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="h-12 px-6 text-left align-middle font-semibold text-muted-foreground bg-muted/20">Video</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground bg-muted/20">Course</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground bg-muted/20">Duration</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground bg-muted/20">Watched</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-6 text-right align-middle font-semibold text-muted-foreground bg-muted/20">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videoWatchHistory.slice(0, 20).map((v) => (
                    <TableRow key={v.lessonId} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <TableCell className="px-6 py-4 font-medium max-w-[200px] truncate">{v.lessonTitle}</TableCell>
                      <TableCell className="px-4 py-4 text-muted-foreground max-w-[140px] truncate">{v.courseTitle}</TableCell>
                      <TableCell className="px-4 py-4 font-mono text-left">{formatDuration(v.durationSeconds)}</TableCell>
                      <TableCell className="px-4 py-4 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${v.completionPercentage}%`, background: v.completed ? 'var(--success)' : 'var(--chart-1)' }} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{v.completionPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-left">
                        {v.completed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/20">Done</span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right text-muted-foreground">{formatDate(v.lastWatchedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">No watch history yet</div>
          )}
        </div>
      </TransitionItem>

      <TransitionItem index={4}>
        <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
          <div><h2 className="text-sm font-semibold">Completion status</h2><p className="text-xs text-muted-foreground mt-0.5">Finished vs in progress vs not started</p></div>
          <div className="flex items-center justify-center h-[180px]">
            {(() => {
              const completionData = [
                { name: 'Completed', value: videoStats.completed, fill: 'var(--success)' },
                { name: 'In Progress', value: videoStats.inProgress, fill: 'var(--chart-1)' },
                { name: 'Not Started', value: videoStats.notStarted, fill: 'var(--muted)' },
              ].filter(d => d.value > 0);
              return (
                <ChartContainer config={VIDEO_COMPLETION_CONFIG} className="h-full w-full max-w-[200px]">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={completionData}
                      dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--background)"
                    >
                      {completionData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              );
            })()}
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: 'var(--success)' }} /><span className="text-muted-foreground">Completed ({videoStats.completed})</span></div>
            <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: 'var(--chart-1)' }} /><span className="text-muted-foreground">In progress ({videoStats.inProgress})</span></div>
            <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: 'var(--muted)' }} /><span className="text-muted-foreground">Not started ({videoStats.notStarted})</span></div>
          </div>
        </div>
      </TransitionItem>

      <TransitionItem index={5}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart2 className="size-4 text-primary" /></div>
              <div>
                <h2 className="text-sm font-semibold">Watch depth</h2>
                <p className="text-xs text-muted-foreground mt-0.5">How much of each video you watched</p>
              </div>
            </div>
            {videoWatchHistory.length > 0 ? (
              <div className="h-[200px]">
                <ChartContainer config={WATCH_DEPTH_CONFIG} className="h-full w-full">
                  <BarChart data={watchDepthData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {watchDepthData.map((entry) => {
                        const color = entry.range === '0–25%' ? 'oklch(0.7 0.2 25)' : entry.range === '25–50%' ? 'oklch(0.75 0.18 55)' : entry.range === '50–75%' ? 'oklch(0.7 0.2 145)' : 'oklch(0.65 0.22 160)';
                        return <Cell key={entry.range} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <Empty className="h-[200px]"><EmptyHeader><EmptyMedia variant="icon"><BarChart2 className="size-6" /></EmptyMedia><EmptyTitle>No watch data</EmptyTitle></EmptyHeader></Empty>
            )}
          </div>

          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Activity className="size-4 text-primary" /></div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-semibold">Drop-off analysis</h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="size-4 rounded-full bg-muted/50 flex items-center justify-center text-[9px] font-bold cursor-help">?</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Distribution of video completion percentages — shows where learners typically stop watching</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Where students stop watching</p>
              </div>
            </div>
            {videoWatchHistory.length > 0 ? (
              <div className="space-y-3">
                {dropoffData.map((b) => {
                  const total = dropoffData.reduce((s, d) => s + d.count, 0);
                  const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                  return (
                    <div key={b.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{b.label} watched</span>
                        <span className="text-muted-foreground">{b.count} videos ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.fill }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="size-3.5 text-success" />
                    <span className="text-muted-foreground">
                      {dropoffData[4].count > 0 ? `${Math.round((dropoffData[4].count / Math.max(videoWatchHistory.length, 1)) * 100)}% of videos fully completed` : 'No videos fully completed yet'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <Empty className="h-[200px]"><EmptyHeader><EmptyMedia variant="icon"><Activity className="size-6" /></EmptyMedia><EmptyTitle>No watch data yet</EmptyTitle><EmptyDescription>Play a video to start tracking your viewing patterns.</EmptyDescription></EmptyHeader></Empty>
            )}
          </div>
        </div>
      </TransitionItem>

      <TransitionItem index={6}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Repeat className="size-4 text-primary" /></div>
              <div>
                <h2 className="text-sm font-semibold">Re-watched videos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Videos you&apos;ve watched more than once</p>
              </div>
            </div>
            {rewatchData.length > 0 ? (
              <div className="space-y-2">
                {rewatchData.map((v) => (
                  <div key={v.fullTitle} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Repeat className="size-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{v.fullTitle}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{v.course}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold">{v.ratio}%</p>
                      <p className="text-[10px] text-muted-foreground">{v.watchMinutes}m / {v.durationMinutes}m</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Play className="size-5 mx-auto mb-2 opacity-50" />
                No re-watched videos yet
              </div>
            )}
          </div>

          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Timer className="size-4 text-primary" /></div>
              <div>
                <h2 className="text-sm font-semibold">Session insights</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Your watching patterns</p>
              </div>
            </div>
            {videoSessionInsights ? (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Avg. session</p>
                    <p className="text-lg font-bold mt-0.5">{videoStats.total > 0 ? Math.round(videoStats.totalWatchHours * 60 / videoStats.total) : 0}m</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Longest session</p>
                    <p className="text-lg font-bold mt-0.5">{videoSessionInsights.longestSession}m</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Median session</p>
                    <p className="text-lg font-bold mt-0.5">{videoSessionInsights.medianSession}m</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Unique courses</p>
                    <p className="text-lg font-bold mt-0.5">{videoSessionInsights.uniqueCourses}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total watch time</p>
                      <p className="text-xl font-bold text-primary mt-0.5">{videoSessionInsights.totalWatchMin}m</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Completion rate</p>
                      <p className="text-xl font-bold text-success mt-0.5">{videoSessionInsights.completionRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Timer className="size-5 mx-auto mb-2 opacity-50" />
                No session data yet
              </div>
            )}
          </div>
        </div>
      </TransitionItem>
    </div>
  );
}
