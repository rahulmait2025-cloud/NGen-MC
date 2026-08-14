'use client';

import { useState, useCallback } from 'react';
import { FileText, File, Link2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPdfSignedUrlAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/course-resources-actions';
import type { CourseResourceSummary } from '@/types/database';

interface LessonResourcesPanelProps {
  collegeSlug: string;
  courseId: string;
  resources: CourseResourceSummary[];
  onOpenResource: (resource: CourseResourceSummary, signedUrl?: string) => void;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  markdown: <FileText className="size-3.5 text-blue-500" />,
  pdf: <File className="size-3.5 text-destructive" />,
  external_link: <Link2 className="size-3.5 text-purple-500" />,
};

const TYPE_LABELS: Record<string, string> = {
  markdown: 'Markdown Note',
  pdf: 'PDF Document',
  external_link: 'External Link',
};

export function LessonResourcesPanel({
  collegeSlug,
  courseId,
  resources,
  onOpenResource,
  className,
}: LessonResourcesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleResourceClick = useCallback(
    async (resource: CourseResourceSummary) => {
      if (resource.resource_type === 'pdf') {
        setLoadingId(resource.id);
        try {
          const res = await getPdfSignedUrlAction(collegeSlug, courseId, resource.id);
          if (res.success && res.signedUrl) {
            onOpenResource(resource, res.signedUrl);
          }
        } finally {
          setLoadingId(null);
        }
      } else {
        onOpenResource(resource);
      }
    },
    [collegeSlug, courseId, onOpenResource],
  );

  if (resources.length === 0) return null;

  return (
    <div className={cn('rounded-lg border border-border/40 bg-card/50', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/30"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
        )}
        <FileText className="size-3.5 text-primary/70" />
        <span className="text-xs font-semibold text-foreground/80">Resources</span>
        <span className="rounded-md bg-primary/8 px-1.5 py-0.5 text-[11px] font-bold text-primary/80">
          {resources.length}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border/20 px-3.5 pb-2 pt-2">
          <div className="space-y-0.5">
            {resources.map((resource) => (
              <button
                key={resource.id}
                type="button"
                onClick={() => handleResourceClick(resource)}
                disabled={loadingId === resource.id}
                className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/30 disabled:opacity-50"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/30">
                  {TYPE_ICONS[resource.resource_type] ?? <FileText className="size-3.5 text-muted-foreground/50" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground/80 group-hover:text-foreground">
                    {resource.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground/50">
                    {TYPE_LABELS[resource.resource_type] ?? 'File'}
                  </p>
                </div>
                {loadingId === resource.id ? (
                  <div className="animate-spin"><Loader2 className="size-3.5 text-muted-foreground/50" /></div>
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
