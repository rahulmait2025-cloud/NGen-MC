"use client";

import React, { useEffect, useMemo, useReducer } from "react";
import {
  Users,
  Video,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  PlayCircle,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "@/lib/recharts-client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCachedData } from "@/lib/hooks/use-cached-data";

interface CourseRow {
  courseId: string;
  courseTitle: string;
  totalAssignedStudents: number;
  activeWatchers: number;
  totalHoursWatched: number;
  lecturesWatched: number;
  averageCompletionPercentage: number;
}

interface VideoRow {
  videoId: string;
  videoTitle: string;
  duration: number;
  totalWatchers: number;
  totalHoursWatched: number;
  averageCompletionPercentage: number;
}

interface ModuleRow {
  moduleId: string;
  moduleTitle: string;
  totalVideos: number;
  watchedVideosCount: number;
  totalWatchedHours: number;
  averageCompletionPercentage: number;
  videos: VideoRow[];
}

interface DailyRow {
  date: string;
  watchedHours: number;
  lecturesWatched: number;
}

interface WeeklyRow {
  weekStart: string;
  weekEnd: string;
  watchedHours: number;
  lecturesWatched: number;
}

// Reducer for analytics state to reduce re-renders
type DashboardAction =
  | { type: 'SET_COURSE'; courseId: string }
  | { type: 'SET_WEEK'; week: string }
  | { type: 'SET_MONTH'; month: string }
  | { type: 'TOGGLE_MODULE'; moduleId: string };

interface DashboardState {
  selectedCourseId: string;
  weekStart: string;
  monthStr: string;
  expandedModuleId: string;
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_COURSE':
      return { ...state, selectedCourseId: action.courseId };
    case 'SET_WEEK':
      return { ...state, weekStart: action.week };
    case 'SET_MONTH':
      return { ...state, monthStr: action.month };
    case 'TOGGLE_MODULE':
      return {
        ...state,
        expandedModuleId: state.expandedModuleId === action.moduleId ? '' : action.moduleId,
      };
    default:
      return state;
  }
}

const formatSecToMin = (sec: number) => {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins}m ${secs}s`;
};

function DashboardHeader({
  overview,
  isLoading,
  onRefresh,
}: {
  overview: { totalStudents?: number } | null;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/20 via-amber-500/10 to-indigo-500/10 border border-border p-6 lg:p-8 shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Sparkles className="w-48 h-48 text-primary" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-extrabold mb-3 shadow-inner">
            <Sparkles className="h-3.5 w-3.5" /> Admin Command Center
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
            Cohort Video Analytics
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Real-time telemetry and student engagement across your assigned courses.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end bg-card/80 border border-border px-4 py-2.5 rounded-2xl shadow-lg">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Enrolled</span>
            <span className="text-lg font-extrabold text-foreground">{overview?.totalStudents || 0} Students</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary text-foreground font-bold rounded-2xl transition-[background-color] duration-150 border border-border shadow cursor-pointer disabled:opacity-50"
          >
            <div className={cn(isLoading && "animate-spin")}><RefreshCw className="h-4 w-4" /></div>
            <span className="text-xs">Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCardsSection({ overview }: { overview: { totalHoursWatched?: number; totalLecturesWatched?: number; averageCompletionPercentage?: number; totalStudents?: number; mostWatchedCourseTitle?: string; leastWatchedCourseTitle?: string } | null }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <div className="bg-card/80 border border-border rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-[border-color,box-shadow] duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Hours</span>
          <div className="p-2 rounded-xl bg-primary/20 text-primary font-bold">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-foreground mb-1">
          {overview?.totalHoursWatched || 0} <span className="text-xs text-muted-foreground font-bold">hrs</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">Cumulative watch duration</p>
      </div>

      <div className="bg-card/80 border border-border rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-[border-color,box-shadow] duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lectures</span>
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold">
            <Video className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-foreground mb-1">
          {overview?.totalLecturesWatched || 0}
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">Total completed lectures</p>
      </div>

      <div className="bg-card/80 border border-border rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-[border-color,box-shadow] duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Completion</span>
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-foreground mb-1">
          {overview?.averageCompletionPercentage || 0}%
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">Cohort progress rate</p>
      </div>

      <div className="bg-card/80 border border-border rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-[border-color,box-shadow] duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cohort Size</span>
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-foreground mb-1">
          {overview?.totalStudents || 0}
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">Assigned active learners</p>
      </div>

      <div className="bg-card/80 border border-border rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-[border-color,box-shadow] duration-200 xl:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Top Course</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Award className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-xs font-extrabold text-foreground line-clamp-2 leading-snug">
          {overview?.mostWatchedCourseTitle || "N/A"}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Highest engagement</p>
      </div>

      <div className="bg-card/80 border border-border rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-[border-color,box-shadow] duration-200 xl:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-red-400">Low Course</span>
          <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-xs font-extrabold text-foreground line-clamp-2 leading-snug">
          {overview?.leastWatchedCourseTitle || "N/A"}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Needs attention</p>
      </div>
    </div>
  );
}

function CourseEngagementTable({
  courses,
  selectedCourseId,
  onSelectCourse,
}: {
  courses: CourseRow[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
}) {
  return (
    <div className="bg-card/80 border border-border rounded-3xl p-6 lg:p-8 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Course Engagement Breakdown
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Select a course to inspect specific module and video telemetry.</p>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          <Select value={selectedCourseId} onValueChange={onSelectCourse}>
            <SelectTrigger className="bg-secondary border-border rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer w-full sm:w-72 shadow">
              <SelectValue placeholder="All Assigned Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Assigned Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.courseId} value={c.courseId}>
                  {c.courseTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full text-left">
          <TableHeader>
            <TableRow className="border-b border-border text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              <TableHead className="pb-4 pr-4">Course Name</TableHead>
              <TableHead className="pb-4 px-4 text-center">Assigned</TableHead>
              <TableHead className="pb-4 px-4 text-center">Active Watchers</TableHead>
              <TableHead className="pb-4 px-4 text-right">Hours Watched</TableHead>
              <TableHead className="pb-4 px-4 text-right">Lectures</TableHead>
              <TableHead className="pb-4 pl-4 text-right">Avg Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/50 text-xs">
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground font-medium">
                  No course engagement records found for this cohort.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((c) => {
                const isSelected = c.courseId === selectedCourseId;
                return (
                  <TableRow
                    key={c.courseId}
                    onClick={() => onSelectCourse(c.courseId)}
                    className={cn(
                      "hover:bg-muted/50 transition-colors cursor-pointer",
                      isSelected && "bg-primary/10 font-bold"
                    )}
                  >
                    <TableCell className="py-4 pr-4 font-extrabold text-foreground max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", isSelected ? "bg-primary animate-ping" : "bg-zinc-600")} />
                        <span className="truncate">{c.courseTitle}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center text-muted-foreground font-semibold">
                      {c.totalAssignedStudents}
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center">
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/20">
                        {c.activeWatchers}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right font-extrabold text-foreground">
                      {c.totalHoursWatched} hrs
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right font-semibold text-muted-foreground">
                      {c.lecturesWatched}
                    </TableCell>
                    <TableCell className="py-4 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-extrabold text-foreground">{c.averageCompletionPercentage}%</span>
                        <Progress
                          value={Math.min(c.averageCompletionPercentage, 100)}
                          className="w-16 h-1.5"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ChartsSection({
  dailyData,
  weeklyData,
  weekStart,
  monthStr,
  onWeekChange,
  onMonthChange,
}: {
  dailyData: DailyRow[];
  weeklyData: WeeklyRow[];
  weekStart: string;
  monthStr: string;
  onWeekChange: (week: string) => void;
  onMonthChange: (month: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card/80 border border-border rounded-3xl p-6 lg:p-8 shadow-2xl flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Daily Watch Telemetry
            </h3>
            <p className="text-xs text-muted-foreground">Hours and lectures watched per day for selected week.</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-2xl px-3 py-1.5 shadow">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={weekStart}
              onChange={(e) => onWeekChange(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              aria-label="Select week"
            />
          </div>
        </div>

        <div className="flex-1 min-h-[300px]">
          {dailyData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground font-medium text-xs">
              No daily telemetry recorded for this week.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminColorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "16px",
                    color: "hsl(var(--foreground))",
                    fontWeight: "bold",
                    fontSize: "12px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="watchedHours"
                  name="Watched Hours"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#adminColorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-card/80 border border-border rounded-3xl p-6 lg:p-8 shadow-2xl flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" /> Weekly Engagement Trend
            </h3>
            <p className="text-xs text-muted-foreground">Total watch duration per week for selected month.</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-2xl px-3 py-1.5 shadow">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="month"
              value={monthStr}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              aria-label="Select month"
            />
          </div>
        </div>

        <div className="flex-1 min-h-[300px]">
          {weeklyData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground font-medium text-xs">
              No weekly telemetry recorded for this month.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="weekStart" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "16px",
                    color: "hsl(var(--foreground))",
                    fontWeight: "bold",
                    fontSize: "12px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <Bar dataKey="watchedHours" name="Watched Hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleAccordion({
  modules,
  selectedCourseTitle,
  expandedModuleId,
  onToggleModule,
}: {
  modules: ModuleRow[];
  selectedCourseTitle: string;
  expandedModuleId: string;
  onToggleModule: (moduleId: string) => void;
}) {
  return (
    <div className="bg-card/80 border border-border rounded-3xl p-6 lg:p-8 shadow-2xl lg:col-span-2 flex flex-col">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <div>
          <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-amber-400" /> Module & Video Telemetry
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed breakdown for <span className="font-extrabold text-foreground">{selectedCourseTitle}</span>.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-muted/50 border border-border font-bold text-muted-foreground">
          {modules.length} Modules
        </span>
      </div>

      <div className="flex-1 space-y-4">
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
            <Video className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">No active video modules found</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">Select a different course above to view module analytics.</p>
          </div>
        ) : (
          modules.map((m) => {
            const isExpanded = expandedModuleId === m.moduleId;
            return (
              <div
                key={m.moduleId}
                className={cn(
                  "border border-border rounded-2xl bg-card/60 transition-[border-color,box-shadow,background-color] duration-200 overflow-hidden shadow",
                  isExpanded && "border-primary/50 shadow-lg bg-card"
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggleModule(m.moduleId)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/50 transition-colors text-left w-full"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("p-2 rounded-xl mt-0.5 shrink-0", isExpanded ? "bg-primary text-black font-bold" : "bg-muted/50 text-muted-foreground")}>
                      <PlayCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-foreground truncate">{m.moduleTitle}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{m.watchedVideosCount} / {m.totalVideos} Videos Watched</span>
                        <span>•</span>
                        <span className="font-bold text-primary">{m.totalWatchedHours} hrs total</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
<div className="text-right">
                       <div className="text-xs font-extrabold text-foreground">{m.averageCompletionPercentage}% Avg</div>
                       <Progress
                         value={Math.min(m.averageCompletionPercentage, 100)}
                         className="w-24 h-1.5 mt-1"
                       />
                     </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-card/95 p-4 space-y-2">
                    {m.videos.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-3 text-center font-medium">No videos published in this module.</div>
                    ) : (
                      m.videos.map((v) => (
                        <div key={v.videoId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors gap-3 border border-border/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground truncate">{v.videoTitle}</div>
                              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Duration: {formatSecToMin(v.duration)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-xs shrink-0 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Watchers</span>
                              <span className="font-extrabold text-blue-400">{v.totalWatchers}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Hours</span>
                              <span className="font-extrabold text-emerald-400">{v.totalHoursWatched}h</span>
                            </div>
                            <div className="text-right min-w-[60px]">
                              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Avg %</span>
                              <span className="font-extrabold text-amber-400">{v.averageCompletionPercentage}%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CohortPieChart({
  pieChartItems,
  pieData,
}: {
  pieChartItems: { name: string; value: number; color: string }[];
  pieData: { completedCourses?: number; startedCourses?: number; notStartedCourses?: number } | null;
}) {
  return (
    <div className="bg-card/80 border border-border rounded-3xl p-6 lg:p-8 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-indigo-400" /> Cohort Engagement Split
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Distribution across enrolled student courses.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
        {pieChartItems.length === 0 ? (
          <div className="text-muted-foreground font-medium text-xs text-center py-12">
            No course engagement status available for this cohort.
          </div>
        ) : (
          <>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartItems}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartItems.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="hsl(var(--border))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "16px",
                      color: "hsl(var(--foreground))",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full mt-4 bg-secondary/60 border border-border p-3 rounded-2xl text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span>Completed</span>
                </div>
                <span className="text-base font-extrabold text-foreground mt-0.5">{pieData?.completedCourses || 0}</span>
              </div>
              <div className="flex flex-col items-center border-x border-border px-2">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm" />
                  <span>Started</span>
                </div>
                <span className="text-base font-extrabold text-foreground mt-0.5">{pieData?.startedCourses || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-500 shadow-sm" />
                  <span>Unstarted</span>
                </div>
                <span className="text-base font-extrabold text-foreground mt-0.5">{pieData?.notStartedCourses || 0}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CollegeVideoAnalyticsDashboard({ collegeSlug }: { collegeSlug: string }) {
  const [state, dispatch] = useReducer(dashboardReducer, {
    selectedCourseId: '',
    weekStart: (() => {
      const d = new Date();
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return d.toISOString().split('T')[0];
    })(),
    monthStr: new Date().toISOString().slice(0, 7),
    expandedModuleId: '',
  });

  const fetcher = useMemo(
    () => async () => {
      const params = new URLSearchParams({
        collegeSlug,
        weekStart: state.weekStart,
        month: state.monthStr,
      });
      if (state.selectedCourseId) {
        params.append("courseId", state.selectedCourseId);
      }

      const res = await fetch(`/api/analytics/admin/video?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load college analytics");
      }

      return data.analytics;
    },
    [collegeSlug, state.selectedCourseId, state.weekStart, state.monthStr],
  );

  const { data, isLoading, error, refetch } = useCachedData({
    key: `video-analytics-${collegeSlug}-${state.selectedCourseId || "all"}-${state.weekStart}-${state.monthStr}`,
    fetcher,
  });

  const overview = data?.overview ?? null;
  const courses: CourseRow[] = data?.courseWise ?? [];
  const modules: ModuleRow[] = data?.moduleAnalytics ?? [];
  const dailyData: DailyRow[] = data?.dailyAnalytics ?? [];
  const weeklyData: WeeklyRow[] = data?.weeklyAnalytics ?? [];
  const pieData = data?.pieChart ?? null;

  // Expand first module and select first course by default when data loads
  useEffect(() => {
    if (!data) return;

    if (data.moduleAnalytics?.length > 0 && !state.expandedModuleId) {
      dispatch({ type: 'TOGGLE_MODULE', moduleId: data.moduleAnalytics[0]?.moduleId || "" });
    }
    if (!state.selectedCourseId && data.courseWise?.length > 0) {
      dispatch({ type: 'SET_COURSE', courseId: data.courseWise[0]?.courseId || "" });
    }
  }, [data, state.expandedModuleId, state.selectedCourseId]);

  const handleCourseChange = (newCid: string) => {
    dispatch({ type: 'SET_COURSE', courseId: newCid });
  };

  const handleWeekChange = (newWeek: string) => {
    dispatch({ type: 'SET_WEEK', week: newWeek });
  };

  const handleMonthChange = (newMonth: string) => {
    dispatch({ type: 'SET_MONTH', month: newMonth });
  };

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-destructive/10 border border-destructive/20 rounded-3xl p-8 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4 animate-pulse" />
        <h3 className="text-xl font-extrabold text-foreground mb-2">Failed to Load Dashboard</h3>
        <p className="text-sm text-destructive mb-6 font-medium">{error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-6 py-3 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-extrabold rounded-xl transition-[background-color,box-shadow] duration-150 shadow-lg"
        >
          <RefreshCw className="h-4 w-4" /> Retry Loading
        </button>
      </div>
    );
  }

  const pieChartItems = pieData
    ? [
        { name: "Completed", value: pieData.completedCourses, color: "#10b981" },
        { name: "In Progress", value: pieData.startedCourses, color: "#3b82f6" },
        { name: "Not Started", value: pieData.notStartedCourses, color: "#6b7280" },
      ].filter((x) => x.value > 0)
    : [];

  const selectedCourseTitle = courses.find((c) => c.courseId === state.selectedCourseId)?.courseTitle || "All Courses";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <DashboardHeader overview={overview} isLoading={isLoading} onRefresh={() => refetch()} />
      <KpiCardsSection overview={overview} />
      <CourseEngagementTable courses={courses} selectedCourseId={state.selectedCourseId} onSelectCourse={handleCourseChange} />
      <ChartsSection
        dailyData={dailyData}
        weeklyData={weeklyData}
        weekStart={state.weekStart}
        monthStr={state.monthStr}
        onWeekChange={handleWeekChange}
        onMonthChange={handleMonthChange}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ModuleAccordion
          modules={modules}
          selectedCourseTitle={selectedCourseTitle}
          expandedModuleId={state.expandedModuleId}
          onToggleModule={(moduleId) => dispatch({ type: 'TOGGLE_MODULE', moduleId })}
        />
        <CohortPieChart pieChartItems={pieChartItems} pieData={pieData} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <Skeleton className="h-32 w-full rounded-3xl bg-muted/50" />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-3xl bg-muted/50" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-3xl bg-muted/50" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-80 w-full rounded-3xl bg-muted/50" />
        <Skeleton className="h-80 w-full rounded-3xl bg-muted/50" />
      </div>
    </div>
  );
}
