'use client';

import React from 'react';
import {
  Layers,
  BookOpen,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModuleAnalyticsDetail } from '@/lib/analytics/student-video-analytics-service';

interface AvailableCourse {
  id: string;
  title: string;
}

interface ModuleWiseAnalyticsListProps {
  selectedCourseId: string;
  availableCourses: AvailableCourse[];
  moduleAnalytics: ModuleAnalyticsDetail[];
  expandedModuleId: string | null;
  onCourseChange: (courseId: string) => void;
  onToggleModule: (moduleId: string) => void;
}

const moduleCompletionPct = (mod: ModuleAnalyticsDetail) =>
  Math.round((mod.watchedVideosCount / Math.max(mod.totalVideosInModule, 1)) * 100);

export function ModuleWiseAnalyticsList({
  selectedCourseId,
  availableCourses,
  moduleAnalytics,
  expandedModuleId,
  onCourseChange,
  onToggleModule,
}: ModuleWiseAnalyticsListProps) {
  return (
    <Card className="lg:col-span-2 py-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 pt-5 pb-3 border-b border-border/30 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
            <Layers className="size-4 text-primary" />
            Module-wise Analytics
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Click a module to inspect individual video progress
          </CardDescription>
        </div>
        <Select value={selectedCourseId} onValueChange={onCourseChange}>
          <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs">
            <SelectValue placeholder="Select a course..." />
          </SelectTrigger>
          <SelectContent>
            {availableCourses.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-4">
        {!selectedCourseId ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
            <Info className="size-8 mb-2 opacity-50" />
            <p>Select a course to view module analytics.</p>
          </div>
        ) : moduleAnalytics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
            <BookOpen className="size-8 mb-2 opacity-50" />
            <p>No video modules found for this course.</p>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            value={expandedModuleId || undefined}
            onValueChange={(val) => onToggleModule(val || '')}
            className="rounded-xl border border-border/30 overflow-hidden divide-y divide-border/30"
          >
            {moduleAnalytics.map((mod) => {
              const pct = moduleCompletionPct(mod);
              return (
                <AccordionItem key={mod.moduleId} value={mod.moduleId} className="border-b-0">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1 pr-4">
                      <h4 className="text-sm font-semibold text-foreground truncate">{mod.moduleTitle}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Videos: <strong className="text-foreground">{mod.watchedVideosCount}/{mod.totalVideosInModule}</strong></span>
                        <span>Done: <strong className="text-emerald-600 dark:text-emerald-400">{mod.completedVideosCount}</strong></span>
                        <span>
                          <Clock className="size-3 inline mr-0.5" />
                          {mod.totalHoursWatchedInModule}h
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 mr-2">
                      <div className="text-right">
                        <div className="text-xs font-bold text-foreground">{pct}%</div>
                        <Progress value={pct} className="w-16 h-1.5 mt-1" />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-muted/10 px-5 py-4 border-t border-border/30 pb-4">
                    <div className="space-y-1">
                      {mod.videos.map((vid) => (
                        <div key={vid.videoId} className="flex items-center justify-between gap-3 py-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {vid.completed ? (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            ) : vid.uniqueWatchedSeconds > 0 ? (
                              <div className="size-2 rounded-full bg-amber-500 shrink-0" />
                            ) : (
                              <div className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
                            )}
                            <span className="text-xs font-medium text-foreground truncate">{vid.videoTitle}</span>
                          </div>
                          <span className={cn('text-xs font-semibold shrink-0', vid.completed ? 'text-emerald-600' : 'text-muted-foreground')}>
                            {Math.round(vid.completionPercentage)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
