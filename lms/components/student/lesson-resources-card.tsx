'use client';

import { useState, useCallback } from 'react';
import {
  FileText,
  ExternalLink,
  File,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPdfSignedUrlAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/course-resources-actions';
import type { CourseResourceSummary } from '@/types/database';

function getResourceIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'pdf':
      return <File className="size-5 text-destructive" />;
    case 'markdown':
      return <FileText className="size-5 text-blue-500" />;
    case 'external_link':
      return <ExternalLink className="size-5 text-purple-500" />;
    default:
      return <File className="size-5 text-muted-foreground" />;
  }
}

interface LessonResourcesCardProps {
  collegeSlug: string;
  courseId: string;
  resources: CourseResourceSummary[];
  onOpenResource: (resource: CourseResourceSummary, signedUrl?: string) => void;
  title?: string;
}

export function LessonResourcesCard({
  collegeSlug,
  courseId,
  resources,
  onOpenResource,
  title = 'Lesson Resources',
}: LessonResourcesCardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleOpen = useCallback(
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
        return;
      }

      onOpenResource(resource);
    },
    [collegeSlug, courseId, onOpenResource],
  );

  if (resources.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-md border border-border/50">
      {title ? (
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Paperclip className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">{title}</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {resources.length} {resources.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>
      ) : null}

      <div className="divide-y divide-border/40">
        {resources.map((res) => (
          <div
            key={res.id}
            className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/40"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background">
              {getResourceIcon(res.resource_type)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{res.title}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {res.resource_type.replace('_', ' ')}
                {res.description ? ` · ${res.description}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleOpen(res)}
              disabled={loadingId === res.id}
              className="size-7 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={`Open ${res.title}`}
            >
              {loadingId === res.id ? (
                <div className="animate-spin"><Loader2 className="size-3.5" /></div>
              ) : res.resource_type === 'external_link' ? (
                <ExternalLink className="size-3.5" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
