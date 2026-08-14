"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { AreaChart, Area } from "recharts";
import {
  BarChart3,
  BookOpen,
  Users,
  TrendingUp,
  FileText,
  Mic,
  FileCheck,
  Target,
  Bell,
  Check,
  LayoutDashboard,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

import {
  type DateRange,
  type PipelineStage,
  getCollegeMetrics,
  MODULE_SECTIONS,
  INTERVIEW_SESSIONS,
  RESUME_CHECKLIST,
  CAREER_BREAKDOWN,
  JOB_ALERTS,
} from "@/components/landing/blocks/mockDashboardPreviewData";

const upliftConfig: ChartConfig = {
  value: { label: "Placement %", color: "var(--primary)" },
};

const KPI_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Enrolled: Users,
  Attendance: BarChart3,
  Placed: TrendingUp,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export function DashboardPreview({ showOnly }: { showOnly?: "student" | "college" }) {
  const [activeView, setActiveView] = useState<"college" | "student">(showOnly || "college");
  const [dateRange, setDateRange] = useState<DateRange>("7");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("lead");
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [interviewSheetOpen, setInterviewSheetOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [careerExpanded, setCareerExpanded] = useState(false);
  const [jobSheetOpen, setJobSheetOpen] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(new Set());

  const metrics = getCollegeMetrics(dateRange);
  const pipeline = metrics.pipeline[pipelineStage];
  const visibleJobs = JOB_ALERTS.filter((j) => !dismissedJobs.has(j.id));

  return (
    <section id="dashboards" className="py-14 md:py-16 px-6 bg-transparent">
      <div className="max-w-7xl mx-auto">
        <m.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge
            variant="outline"
            className="mb-4 text-primary border-primary/20 bg-primary/10"
          >
            <LayoutDashboard className="h-3 w-3 mr-1" /> Platform Preview
          </Badge>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            See what you&apos;ll get once you partner with us
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Transparent outcomes for both institutions and students.
          </p>
        </m.div>

        <TooltipProvider delayDuration={200}>
          {!showOnly && (
            <Tabs
              value={activeView}
              onValueChange={(v) => setActiveView(v as "college" | "student")}
              className="lg:hidden mb-6"
            >
              <TabsList className="w-full" aria-label="Dashboard view">
                <TabsTrigger value="college" className="flex-1 gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" /> College
                </TabsTrigger>
                <TabsTrigger value="student" className="flex-1 gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Student
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className={showOnly ? "max-w-3xl mx-auto" : "grid lg:grid-cols-2 gap-8"}>
            {(!showOnly || showOnly === "college") && (
              <m.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className={activeView !== "college" ? "hidden lg:block" : ""}
              >
                <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden h-full flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50 shrink-0">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                    </div>
                    <div className="flex-1 mx-3">
                      <div className="bg-transparent border border-border rounded-md px-3 py-1 text-[11px] text-muted-foreground text-center truncate">
                        college.nextgen-cto.in/dashboard
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 bg-secondary/50">
                    <m.div variants={itemVariants} className="flex items-center gap-2 mb-5">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span className="font-display font-bold text-sm">
                        College Dashboard
                      </span>
                      <span className="ml-auto flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          Live
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </span>
                        <Select
                          value={dateRange}
                          onValueChange={(v) => setDateRange(v as DateRange)}
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-6 text-[10px] w-auto gap-1 min-w-0"
                            aria-label="Date range"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </span>
                    </m.div>

                    <m.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {metrics.kpis.map((kpi) => {
                        const Icon = KPI_ICONS[kpi.label] ?? Users;
                        const isExpanded = expandedKpi === kpi.label;
                        return (
                          <Tooltip key={kpi.label}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-auto p-0 w-full rounded-xl hover:bg-transparent"
                                onClick={() =>
                                  setExpandedKpi(isExpanded ? null : kpi.label)
                                }
                                aria-label={`${kpi.label}: ${kpi.value}`}
                              >
                                <div className="rounded-xl border border-border bg-card p-3 text-center w-full transition-shadow hover:shadow-sm">
                                  <Icon className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                                  <p className="text-[10px] text-muted-foreground">
                                    {kpi.label}
                                  </p>
                                  <p className="text-lg font-display font-bold">
                                    {kpi.value}
                                  </p>
                                  {isExpanded && (
                                    <p className="text-[10px] text-primary mt-1 font-medium">
                                      {kpi.detail}
                                    </p>
                                  )}
                                </div>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Click to see details</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </m.div>

                    <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Placement Uplift
                        </p>
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-green-600 border-0 text-[10px] font-bold"
                        >
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          {metrics.upliftDelta}
                        </Badge>
                      </div>
                      <ChartContainer config={upliftConfig} className="h-24 w-full">
                        <AreaChart data={metrics.upliftData}>
                          <defs>
                            <linearGradient
                              id="preview-uplift-grad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="var(--color-value)"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="100%"
                                stopColor="var(--color-value)"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--color-value)"
                            fill="url(#preview-uplift-grad)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </m.div>

                    <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-4 mb-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Recruiter Pipeline
                      </p>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold">
                          {pipeline.active} Active
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pipeline.percent}%
                        </span>
                      </div>
                      <Progress value={pipeline.percent} className="h-1.5 mb-3" />
                      <Tabs
                        value={pipelineStage}
                        onValueChange={(v) =>
                          setPipelineStage(v as PipelineStage)
                        }
                        className="gap-0"
                      >
                        <TabsList
                          className="h-7 w-full"
                          aria-label="Pipeline stage filter"
                        >
                          <TabsTrigger
                            value="lead"
                            className="text-[10px] h-6 flex-1"
                          >
                            Lead
                          </TabsTrigger>
                          <TabsTrigger
                            value="contacted"
                            className="text-[10px] h-6 flex-1"
                          >
                            Contacted
                          </TabsTrigger>
                          <TabsTrigger
                            value="scheduled"
                            className="text-[10px] h-6 flex-1"
                          >
                            Scheduled
                          </TabsTrigger>
                          <TabsTrigger
                            value="closed"
                            className="text-[10px] h-6 flex-1"
                          >
                            Closed
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </m.div>

                    <m.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Engagement
                        </p>
                        <p className="text-xl font-display font-bold mt-1">
                          {metrics.engagement}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Active Students
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Reports
                            </p>
                            <p className="text-xl font-display font-bold mt-1">
                              {metrics.reportsReady}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Ready
                            </p>
                          </div>
                          <FileText className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      </div>
                    </m.div>
                  </div>
                </div>
              </m.div>
            )}

            {(!showOnly || showOnly === "student") && (
              <m.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className={activeView !== "student" ? "hidden lg:block" : ""}
              >
                <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden h-full flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50 shrink-0">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                    </div>
                    <div className="flex-1 mx-3">
                      <div className="bg-transparent border border-border rounded-md px-3 py-1 text-[11px] text-muted-foreground text-center truncate">
                        learn.nextgen-cto.in/dashboard
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 bg-secondary/50">
                    <m.div variants={itemVariants} className="flex items-center gap-2 mb-5">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="font-display font-bold text-sm">
                        Student Dashboard
                      </span>
                      <Badge className="ml-auto text-[10px] bg-primary/10 text-primary border-0">
                        Pro
                      </Badge>
                    </m.div>

                    <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-4 mb-4">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="learning-path" className="border-0">
                          <AccordionTrigger className="py-0 hover:no-underline">
                            <div className="flex-1 text-left">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                Learning Path
                              </p>
                              <div className="flex items-center justify-between pr-2">
                                <span className="text-sm font-medium">
                                  DSA Module
                                </span>
                                <span className="text-sm font-display font-bold text-primary">
                                  68%
                                </span>
                              </div>
                              <Progress value={68} className="mt-2 h-2" />
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-3 pb-0">
                            <Separator className="mb-3" />
                            <div className="space-y-2">
                              {MODULE_SECTIONS.map((mod) => (
                                <div
                                  key={mod.name}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {mod.completed ? (
                                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                  ) : (
                                    <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                                  )}
                                  <span
                                    className={
                                      mod.completed
                                        ? "text-muted-foreground line-through"
                                        : ""
                                    }
                                  >
                                    {mod.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </m.div>

                    <m.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Mic className="h-3.5 w-3.5 text-primary" />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Mock Interviews
                          </p>
                        </div>
                        <p className="text-xl font-display font-bold">4/6</p>
                        <p className="text-[10px] text-muted-foreground mb-2">
                          Completed
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8"
                          onClick={() => setInterviewSheetOpen(true)}
                        >
                          View Sessions
                        </Button>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileCheck className="h-3.5 w-3.5 text-primary" />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Resume
                          </p>
                        </div>
                        <p className="text-sm font-medium">ATS Score</p>
                        <p className="text-xl font-display font-bold text-primary mb-2">
                          85%
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8"
                          onClick={() => setResumeDialogOpen(true)}
                        >
                          Check Resume
                        </Button>
                      </div>
                    </m.div>

                    <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-4 mb-4">
                      <Button
                        variant="ghost"
                        className="h-auto p-0 w-full text-left hover:bg-transparent"
                        onClick={() => setCareerExpanded(!careerExpanded)}
                        aria-label="Career readiness breakdown"
                      >
                        <div className="w-full">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Target className="h-3.5 w-3.5 text-primary" />
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Career Readiness
                            </p>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-display font-bold">
                              78
                            </span>
                            <span className="text-sm text-muted-foreground">
                              /100
                            </span>
                          </div>
                          <Progress
                            value={78}
                            className="mt-2 h-1.5"
                            indicatorClassName="bg-green-500"
                          />
                        </div>
                      </Button>
                      {careerExpanded && (
                        <div className="mt-4 space-y-3">
                          <Separator />
                          {CAREER_BREAKDOWN.map((item) => (
                            <div key={item.label}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {item.label}
                                </span>
                                <span className="text-xs font-medium">
                                  {item.value}%
                                </span>
                              </div>
                              <Progress
                                value={item.value}
                                className="h-1"
                                indicatorClassName={
                                  item.value >= 80 ? "bg-green-500" : undefined
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </m.div>

                    <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Job Alerts
                          </p>
                          <p className="text-xl font-display font-bold mt-1">
                            {visibleJobs.length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            New Matches
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 text-xs h-8"
                        onClick={() => setJobSheetOpen(true)}
                      >
                        View Matches
                      </Button>
                    </m.div>
                  </div>
                </div>
              </m.div>
            )}
          </div>
        </TooltipProvider>

        <Sheet open={interviewSheetOpen} onOpenChange={setInterviewSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Mock Interview Sessions</SheetTitle>
              <SheetDescription>
                Your scheduled and completed interviews
              </SheetDescription>
            </SheetHeader>
            <Separator />
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-2">
                {INTERVIEW_SESSIONS.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {session.topic}
                      </span>
                      <Badge
                        variant={
                          session.status === "Completed"
                            ? "secondary"
                            : session.status === "Scheduled"
                              ? "outline"
                              : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.date}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resume ATS Check</DialogTitle>
              <DialogDescription>
                How your resume scores against ATS systems
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {RESUME_CHECKLIST.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={item.passed}
                    disabled
                    aria-label={item.label}
                  />
                  <span
                    className={`text-sm ${item.passed ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <Badge className="text-sm">85%</Badge>
            </div>
          </DialogContent>
        </Dialog>

        <Sheet open={jobSheetOpen} onOpenChange={setJobSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Job Matches</SheetTitle>
              <SheetDescription>Roles matching your profile</SheetDescription>
            </SheetHeader>
            <Separator />
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-2">
                {visibleJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{job.role}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {job.matchPercent}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {job.company}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant={savedJobs.has(job.id) ? "default" : "outline"}
                        size="xs"
                        className="flex-1"
                        onClick={() => {
                          setSavedJobs((prev) => {
                            const next = new Set(prev);
                            if (next.has(job.id)) next.delete(job.id);
                            else next.add(job.id);
                            return next;
                          });
                        }}
                      >
                        {savedJobs.has(job.id) ? "Saved" : "Save"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="flex-1 text-muted-foreground"
                        onClick={() => {
                          setDismissedJobs((prev) =>
                            new Set(prev).add(job.id)
                          );
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
                {visibleJobs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No more job matches
                  </p>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
