'use client';

import { useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  ExternalLink,
  ArrowRight,
  Info,
  HelpCircle,
  FileQuestion,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonItemPlaceholder } from './lesson-item-placeholder';
import type { MasterCourseItemsRow } from '@/types/database';

interface NonVideoLessonRendererProps {
  item: MasterCourseItemsRow;
}

const RESOURCE_ICONS = {
  document: FileText,
  worksheet: FileText,
  resource: FileText,
  link: ExternalLink,
  note: Info,
  quiz_placeholder: FileQuestion,
  assignment_placeholder: ClipboardList,
} as const;

const RESOURCE_COLORS: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  document: { bg: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/20' },
  worksheet: { bg: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/20' },
  resource: { bg: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/20' },
  link: { bg: 'bg-success/10', text: 'text-success', ring: 'ring-success/20' },
  note: { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/20' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', ring: 'ring-border' },
};

export function NonVideoLessonRenderer({ item }: NonVideoLessonRendererProps) {
  const [isOpening, setIsOpening] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  const handleAction = () => {
    const url = (item.metadata?.url as string) || (item.metadata?.file_path as string);
    if (url) {
      setIsOpening(true);
      window.open(url, '_blank');
      // Reset after a short delay so the spinner doesn't persist
      window.setTimeout(() => setIsOpening(false), 1500);
    }
  };

  // Specialized placeholders for quizzes and assignments
  if (item.item_type === 'quiz_placeholder') {
    return <LessonItemPlaceholder type="quiz" title={item.title} />;
  }
  if (item.item_type === 'assignment_placeholder') {
    return <LessonItemPlaceholder type="assignment" title={item.title} />;
  }

  // Note / article type
  if (item.item_type === 'note') {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-0"
        >
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
              note
            </Badge>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {item.title}
            </h2>
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
            {(item.metadata?.content as string) || 'No content provided for this note.'}
          </div>
        </m.div>
      </LazyMotion>
    );
  }

  // Document / link / resource type — minimal, inline treatment
  const Icon = RESOURCE_ICONS[item.item_type as keyof typeof RESOURCE_ICONS] ?? HelpCircle;
  const color = RESOURCE_COLORS[item.item_type] ?? RESOURCE_COLORS.default;
  const url = (item.metadata?.url as string) || (item.metadata?.file_path as string);
  const hasAction = !!url;
  const fileType = (item.metadata?.file_type as string) ?? null;
  const fileSize = (item.metadata?.size as string) ?? null;

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-0"
      >
        <div className="mb-5 flex items-center gap-2">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${color.bg} ${color.text}`}>
            {item.item_type}
          </span>
          {fileType ? (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {fileType}{fileSize ? ` · ${fileSize}` : ''}
            </span>
          ) : null}
        </div>

        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {item.title}
        </h2>

        {item.description ? (
          <p className="mb-6 text-sm text-muted-foreground md:text-base">
            {item.description}
          </p>
        ) : (
          <p className="mb-6 text-sm text-muted-foreground">
            This {item.item_type} is an essential part of the module curriculum.
          </p>
        )}

        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-md ${color.bg} ring-1 ${color.ring}`}>
            <Icon className={`size-5 ${color.text}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {item.item_type === 'link' ? 'External resource' : (fileType ? `${fileType.toUpperCase()} file` : 'Resource file')}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {item.item_type === 'link' ? 'Opens in a new tab' : (fileSize ? `Size: ${fileSize}` : 'Click to open')}
            </p>
          </div>
          {hasAction ? (
            <Button
              onClick={handleAction}
              size="sm"
              disabled={isOpening}
              className="h-9 shrink-0 gap-1.5 rounded-md px-4"
            >
              {isOpening ? (
                <CheckCircle2 className="size-3.5" aria-hidden />
              ) : item.item_type === 'link' ? (
                <ExternalLink className="size-3.5" aria-hidden />
              ) : (
                <ArrowRight className="size-3.5" aria-hidden />
              )}
              {item.item_type === 'link' ? 'Visit' : 'Open'}
            </Button>
          ) : null}
        </div>
      </m.div>
    </LazyMotion>
  );
}
