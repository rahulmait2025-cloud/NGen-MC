import Link from 'next/link';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { 
  Layers, 
  BookOpen, 
  AlertCircle, 
  Clock, 
  FolderOpen, 
  ExternalLink,
  Video,
  Calendar,
  Hash,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  School,
  User
} from 'lucide-react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCoursePillarById, listMasterCoursePillars, getPillarDiagnosticInfo } from '@/lib/services/master-course-pillars';
import { listCoursesForPillar } from '@/lib/services/master-courses';
import type { MasterCourseWithStats } from '@/lib/services/master-courses';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignPillarDialog } from '@/components/master-courses/assign-pillar-dialog';
import { Separator } from '@/components/ui/separator';
import { CreateCourseDialog } from '@/components/master-courses/create-course-dialog';
import { CourseVisibilityToggles } from '@/components/master-courses/course-visibility-toggles';
import { CoursePaidCourseToggle } from '@/components/master-courses/course-paid-course-toggle';
import { isPaidCourseBuilderCourse } from '@/lib/services/pricable-products';
import { CourseCardActions } from '@/components/master-courses/course-card-actions';
import { EditPillarDialog } from '@/components/master-courses/edit-pillar-dialog';
import { PublishPillarButton } from '@/components/master-courses/publish-pillar-button';
import { getCourseDeleteImpact } from '@/lib/services/master-course-delete';
import type { CourseDeleteImpact } from '@/lib/services/master-course-delete';
import type { MasterCoursePillarStatsRow } from '@/types/database';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function publishStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border text-[10px] uppercase tracking-wider font-semibold dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Published</Badge>;
    case 'unpublished':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border text-[10px] uppercase tracking-wider font-semibold dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">Unpublished</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">Draft</Badge>;
  }
}

function tpFolderStatusBadge(status: string, error: string | null) {
  switch (status) {
    case 'created':
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50 gap-1 pl-1 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <FolderOpen className="size-3" />
          Synced
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 gap-1 pl-1" title={error ?? 'Sync failed'}>
          <AlertCircle className="size-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1 pl-1">
          <Clock className="size-3" />
          Pending
        </Badge>
      );
  }
}

function RenderabilityChecklist({ info }: { info: { renderable_in_college_admin: boolean, renderable_in_student: boolean, reason?: string } }) {
  return (
    <div className="flex gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`p-1.5 rounded-lg border transition-colors ${info.renderable_in_college_admin ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
               <School className="size-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-semibold">{info.renderable_in_college_admin ? 'Renderable in College Admin' : 'NOT Renderable in College Admin'}</p>
            {info.reason && <p className="text-[10px] mt-1 opacity-80">{info.reason}</p>}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`p-1.5 rounded-lg border transition-colors ${info.renderable_in_student ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
               <User className="size-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-semibold">{info.renderable_in_student ? 'Renderable in Student Hub' : 'NOT Renderable in Student Hub'}</p>
            {info.reason && <p className="text-[10px] mt-1 opacity-80">{info.reason}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

type PillarData = {
  title: string;
  code: string;
  publish_status: string;
  tp_folder_status: string;
  tp_last_error: string | null;
  tp_folder_uuid: string | null;
  created_at: string;
  visible_to_college_admins: boolean;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  description: string | null;
};

type DiagnosticData = {
  courses_count: number;
  published_courses_count: number;
  assigned_colleges_count: number;
  active_assignments_count: number;
  entitled_students_count: number;
  renderable_in_college_admin: boolean;
  renderable_in_student: boolean;
  reason?: string;
  courses: Array<{ id: string }>;
};

function DiagnosticCard({ pillar, diagnostic }: { pillar: PillarData; diagnostic: DiagnosticData }) {
  return (
    <Card className="md:col-span-1 bg-card border-2 border-border/50 shadow-sm overflow-hidden h-fit">
      <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="size-4" />
          Hardening Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-2">
              <CheckCircle2 className="size-3 text-muted-foreground/50" />
              Published Status
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border",
                pillar.publish_status === 'published'
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10"
              )}
            >
              {pillar.publish_status}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-2">
              <School className="size-3 text-muted-foreground/50" />
              College Admins
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border",
                pillar.visible_to_college_admins
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {pillar.visible_to_college_admins ? "VISIBLE" : "HIDDEN"}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-2">
              <Users className="size-3 text-muted-foreground/50" />
              College Students
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border",
                pillar.visible_to_college_students
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {pillar.visible_to_college_students ? "VISIBLE" : "HIDDEN"}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-2">
              <ExternalLink className="size-3 text-muted-foreground/50" />
              Global Students
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border",
                pillar.visible_to_global_students
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {pillar.visible_to_global_students ? "VISIBLE" : "HIDDEN"}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-2">
              <Layers className="size-3 text-muted-foreground/50" />
              TPStreams Synced
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border",
                pillar.tp_folder_uuid
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}
            >
              {pillar.tp_folder_uuid ? "YES" : "NO"}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 mb-1">Courses</p>
            <p className="text-lg font-semibold leading-none">{diagnostic.courses_count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{diagnostic.published_courses_count} Published</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 mb-1">Colleges</p>
            <p className="text-lg font-semibold leading-none">{diagnostic.assigned_colleges_count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{diagnostic.active_assignments_count} Assignments</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span className="text-xs font-semibold">Entitled Students</span>
          </div>
          <span className="text-sm font-black text-primary">{diagnostic.entitled_students_count}</span>
        </div>

        <div className="space-y-2 pt-2">
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Renderability Checklist</p>
            <div className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-bold border ${diagnostic.renderable_in_college_admin ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
              {diagnostic.renderable_in_college_admin ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              College Admin Portal: {diagnostic.renderable_in_college_admin ? 'PASS' : 'FAIL'}
           </div>
           <div className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-bold border ${diagnostic.renderable_in_student ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
              {diagnostic.renderable_in_student ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              Student Learning Hub: {diagnostic.renderable_in_student ? 'PASS' : 'FAIL'}
           </div>
        </div>

        {diagnostic.reason && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex gap-2">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <p className="text-[10px] font-semibold text-amber-800 leading-normal">{diagnostic.reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CourseDiagnosticInfo = {
  renderable_in_college_admin: boolean;
  renderable_in_student: boolean;
  reason?: string;
  assigned_colleges_count: number;
  entitled_students_count: number;
};

function CourseCard({
  course,
  pillarId,
  diag,
  deleteImpact,
  allPillars,
}: {
  course: MasterCourseWithStats;
  pillarId: string;
  diag: CourseDiagnosticInfo | undefined;
  deleteImpact: CourseDeleteImpact;
  allPillars: MasterCoursePillarStatsRow[];
}) {
  return (
    <div
      className="bg-card border rounded-xl p-5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 transition-[border-color,box-shadow] duration-200"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Left: Course Info */}
        <Link
          href={`/master-courses/pillars/${pillarId}/courses/${course.id}`}
          className="flex-1 min-w-0 group"
        >
          <div className="flex items-center gap-2 mb-2">
            {publishStatusBadge(course.publish_status)}
            {tpFolderStatusBadge(course.tp_folder_status, course.tp_last_error)}
            {diag && <RenderabilityChecklist info={diag} />}
          </div>
          <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate flex items-center gap-2">
            {course.title}
            <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="size-3" />
              <code className="font-mono text-[10px]">{course.code}</code>
            </span>
            <span className="text-muted-foreground/50">|</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1 cursor-help">
                    <Users className="size-3" />
                    {diag?.assigned_colleges_count || 0} Colleges
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px] font-semibold">{diag?.entitled_students_count || 0} Entitled Students</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Link>

        {/* Middle: Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Layers className="size-4 text-muted-foreground" />
            <span className="font-medium">{course.module_count}</span>
            <span className="text-muted-foreground text-xs">Modules</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Video className="size-4 text-muted-foreground" />
            <span className="font-medium">{course.video_count}</span>
            <span className="text-muted-foreground text-xs">Videos</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col gap-2">
            <CourseVisibilityToggles
              courseId={course.id}
              pillarId={pillarId}
              initialVisibility={{
                visible_to_college_admins: course.visible_to_college_admins,
                visible_to_college_students: course.visible_to_college_students,
                visible_to_global_students: course.visible_to_global_students,
              }}
            />
            {!isPaidCourseBuilderCourse(course) ? (
              <CoursePaidCourseToggle
                sourceType="master_course"
                sourceId={course.id}
                initialEnabled={!!course.show_as_paid_course}
                compact
                productTitle={course.title}
              />
            ) : null}
          </div>
          <CourseCardActions
            course={course}
            pillarId={pillarId}
            deleteImpact={deleteImpact}
            allPillars={allPillars}
          />
        </div>
      </div>

      {/* Mobile Visibility */}
      <div className="sm:hidden mt-4 pt-4 border-t space-y-3">
        <CourseVisibilityToggles
          courseId={course.id}
          pillarId={pillarId}
          initialVisibility={{
            visible_to_college_admins: course.visible_to_college_admins,
            visible_to_college_students: course.visible_to_college_students,
            visible_to_global_students: course.visible_to_global_students,
          }}
        />
        {!isPaidCourseBuilderCourse(course) ? (
          <CoursePaidCourseToggle
            sourceType="master_course"
            sourceId={course.id}
            initialEnabled={!!course.show_as_paid_course}
            productTitle={course.title}
          />
        ) : null}
      </div>
    </div>
  );
}

export default async function PillarDetailPage({ params }: { params: Promise<{ pillarId: string }> }): Promise<ReactNode> {
  const { pillarId } = await params;

  const [_auth, pillar, courses, allPillars, diagnostic] = await Promise.all([
    getSessionFromHeaders(),
    getMasterCoursePillarById(pillarId),
    listCoursesForPillar(pillarId),
    listMasterCoursePillars(),
    getPillarDiagnosticInfo(pillarId),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  if (!pillar) {
    notFound();
  }
  const courseImpacts = new Map(
    await Promise.all(
      courses.map(async (course) => [course.id, await getCourseDeleteImpact(course.id)] as const),
    ),
  );

  const courseDiagnosticsMap = new Map<string, CourseDiagnosticInfo>(
    diagnostic.courses.map(c => [c.id, c])
  );

return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{pillar.title}</h1>
              {publishStatusBadge(pillar.publish_status)}
              {tpFolderStatusBadge(pillar.tp_folder_status, pillar.tp_last_error)}
            </div>
            <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Hash className="size-3.5" />
                <code className="bg-muted/60 px-1.5 py-0.5 rounded text-[11px] font-mono">{pillar.code}</code>
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
                <Calendar className="size-3.5" />
                Created {new Date(pillar.created_at).toLocaleDateString('en-US')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:mt-1">
           {pillar.publish_status !== 'published' && <PublishPillarButton pillarId={pillarId} />}
           <AssignPillarDialog pillarId={pillarId} pillarTitle={pillar.title} />
           <CreateCourseDialog pillarId={pillarId} />
           <EditPillarDialog pillar={pillar} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diagnostic Card */}
        <DiagnosticCard pillar={pillar} diagnostic={diagnostic} />

        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
        {/* Main Description */}
        {pillar.description && (() => {
          let points: string[] = [];
          try {
            const parsed = JSON.parse(pillar.description);
            if (Array.isArray(parsed)) points = parsed;
            else points = [pillar.description];
          } catch {
            points = [pillar.description];
          }

          return (
            <div className="bg-muted/30 p-5 rounded-xl border-2 border-border/40 shadow-sm">
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Pillar Objectives</h4>
              <div className="space-y-4">
                {points.map((point) => (
                  <div key={`${point.slice(0, 32)}`} className="flex gap-3 items-start group">
                    <div className="mt-1.5 size-1.5 rounded-full bg-primary/60 shrink-0 group-hover:bg-primary [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-125 transition-[background-color,transform] duration-160 ease-[var(--ease-out)]" />
                    <p className="text-sm font-medium leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <BookOpen className="size-4 text-primary" />
              </div>
              <span>Courses Hierarchy</span>
              <Badge variant="secondary" className="ml-1 text-xs">{courses.length}</Badge>
            </h2>
          </div>

          {courses.length === 0 ? (
            <Card className="border-dashed py-16">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="bg-muted/50 rounded-full p-5 mb-4">
                  <BookOpen className="size-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No courses yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-6">
                  Add your first course to start organizing content hierarchy for students.
                </p>
                <CreateCourseDialog pillarId={pillarId} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  pillarId={pillarId}
                  diag={courseDiagnosticsMap.get(course.id)}
                  deleteImpact={courseImpacts.get(course.id)!}
                  allPillars={allPillars}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
