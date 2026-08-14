import {
  AlertTriangle,
  BookOpen,
  Box,
  FileText,
  Layers,
  Package,
  PlayCircle,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
  AssignedBundleDetailComponent,
  AssignedBundleDetailData,
  AssignedBundleLessonRow,
  AssignedBundleModuleGroup,
} from '@/lib/services/assigned-bundle-resolver';

function getComponentKey(component: AssignedBundleDetailComponent): string {
  if ('bundleId' in component && component.bundleId) return component.bundleId;
  if ('variantId' in component && component.variantId) return component.variantId;
  if ('courseId' in component && component.courseId) return component.courseId;
  return `unknown-${Math.random()}`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDurationLong(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function LessonList({ lessons }: { lessons: AssignedBundleLessonRow[] }) {
  if (lessons.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-4 py-3">No published lessons in this selection.</p>
    );
  }

  return (
    <ul className="divide-y divide-border/30">
      {lessons.map((lesson, idx) => (
        <li
          key={lesson.id}
          className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/20"
        >
          <span className="w-6 text-center text-[11px] font-mono text-muted-foreground tabular-nums">
            {idx + 1}
          </span>
          {lesson.item_type === 'video' ? (
            <PlayCircle className="size-4 text-blue-500 shrink-0" />
          ) : (
            <FileText className="size-4 text-muted-foreground shrink-0" />
          )}
          <span className="flex-1 min-w-0 truncate text-foreground">{lesson.title}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
            {formatDuration(lesson.duration_seconds)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ModuleGroups({ modules }: { modules: AssignedBundleModuleGroup[] }) {
  if (modules.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-4 py-3">No modules in this selection.</p>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {modules.map((mod) => (
        <div key={mod.module_id}>
          <div className="px-4 py-2.5 bg-muted/20 flex items-center gap-2">
            <Layers className="size-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground">{mod.module_title}</span>
            <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
              {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
            </span>
          </div>
          <LessonList lessons={mod.lessons} />
        </div>
      ))}
    </div>
  );
}

function ComponentCard({
  component,
  depth = 0,
}: {
  component: AssignedBundleDetailComponent;
  depth?: number;
}) {
  const borderClass = depth > 0 ? 'border-l-2 border-amber-500/30 ml-4' : '';

  if (component.kind === 'master_course') {
    return (
      <div className={`card-tier-1 rounded-xl overflow-hidden ${borderClass}`}>
        <div className="px-4 py-3 border-b border-border/40 flex flex-wrap items-center gap-2">
          <BookOpen className="size-4 text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{component.title}</p>
            <p className="text-[11px] text-muted-foreground">Master course</p>
          </div>
          {component.invalid && (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
              Missing content
            </Badge>
          )}
        </div>
        <ModuleGroups modules={component.modules} />
      </div>
    );
  }

  if (component.kind === 'variant') {
    return (
      <div className={`card-tier-1 rounded-xl overflow-hidden ${borderClass}`}>
        <div className="px-4 py-3 border-b border-border/40 flex flex-wrap items-center gap-2">
          <Box className="size-4 text-indigo-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{component.title}</p>
            <p className="text-[11px] text-muted-foreground">
              Based on {component.parentCourseTitle}
            </p>
          </div>
          {component.invalid && (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
              Missing content
            </Badge>
          )}
        </div>
        <ModuleGroups modules={component.modules} />
      </div>
    );
  }

  if (component.kind === 'master_course_item') {
    return (
      <div className={`card-tier-1 rounded-xl overflow-hidden ${borderClass}`}>
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-sm font-semibold text-foreground">Selected lectures</p>
          <p className="text-[11px] text-muted-foreground">{component.parentCourseTitle}</p>
        </div>
        <LessonList lessons={component.lessons} />
      </div>
    );
  }

  return (
    <div className={`card-tier-1 rounded-xl overflow-hidden ${borderClass}`}>
      <div className="px-4 py-3 border-b border-border/40 flex flex-wrap items-center gap-2">
        <Package className="size-4 text-amber-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{component.title}</p>
          <p className="text-[11px] text-muted-foreground">Nested bundle</p>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {component.module_count} mod · {component.lesson_count} lessons · {component.video_count} videos
        </span>
      </div>
          {component.components.length > 0 ? (
        <div className="p-4 space-y-4">
          {component.components.map((child) => (
            <ComponentCard key={getComponentKey(child)} component={child} depth={depth + 1} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic px-4 py-3">No resolved child content.</p>
      )}
    </div>
  );
}

export function BundleDetailView({ data }: { data: AssignedBundleDetailData }) {
  const { bundle, summary, components, warnings } = data;

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-400">Content warnings</p>
            <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card-tier-1 rounded-xl p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Components</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{summary.component_count}</p>
        </div>
        <div className="card-tier-1 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Modules</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{summary.module_count}</p>
        </div>
        <div className="card-tier-1 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Lessons</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{summary.lesson_count}</p>
        </div>
        <div className="card-tier-1 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
            <Video className="size-3" /> Videos
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{summary.video_count}</p>
        </div>
        <div className="card-tier-1 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Duration</p>
          <p className="text-2xl font-bold tabular-nums mt-1">
            {formatDurationLong(summary.total_duration_seconds)}
          </p>
        </div>
      </div>

      {bundle.description && (
        <section className="card-tier-1 rounded-xl p-5">
          <h2 className="text-base font-semibold mb-2">About this bundle</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {bundle.description}
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          Bundle contents
        </h2>
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">This bundle has no components yet.</p>
        ) : (
          <div className="space-y-4">
            {components.map((component) => (
              <ComponentCard key={getComponentKey(component)} component={component} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
