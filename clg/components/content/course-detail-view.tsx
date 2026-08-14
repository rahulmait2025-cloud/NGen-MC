'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  PlayCircle,
  FileText,
  Link as LinkIcon,
  HelpCircle,
  Loader2,
  AlertCircle,
  FileDigit,
  Layers,
} from 'lucide-react';
import { useMemo } from 'react';
import Image from 'next/image';
import type { AssignedCourseDetailData } from '@/lib/services/assigned-courses';
import type { MasterCourseItemsRow } from '@/types/database';
import type { VideoAssetsRow } from '@/types/database';

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

function getItemIcon(itemType: string) {
  switch (itemType) {
    case 'video':
      return <PlayCircle className="size-4 text-blue-600 dark:text-blue-400" />;
    case 'document':
    case 'note':
    case 'resource':
      return <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />;
    case 'link':
      return <LinkIcon className="size-4 text-purple-600 dark:text-purple-400" />;
    case 'quiz_placeholder':
      return <HelpCircle className="size-4 text-amber-600 dark:text-amber-400" />;
    case 'assignment_placeholder':
      return <FileDigit className="size-4 text-rose-600 dark:text-rose-400" />;
    default:
      return <FileText className="size-4 text-muted-foreground" />;
  }
}

function formatItemTypeLabel(itemType: string): string {
  return itemType.replace(/_/g, ' ');
}

function LessonRow({
  item,
  index,
  video,
}: {
  item: MasterCourseItemsRow;
  index: number;
  video: VideoAssetsRow | null;
}) {
  const duration =
    item.duration_seconds || (video?.duration_seconds ?? null);

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors ease-[var(--ease-out)]">
      <span className="w-6 shrink-0 text-center text-[11px] font-mono tabular-nums text-muted-foreground">
        {index + 1}
      </span>

      <div className="shrink-0">
        {item.item_type === 'video' && video?.thumbnail_url ? (
          <div className="relative h-11 w-16 sm:h-12 sm:w-[4.5rem] rounded-lg overflow-hidden bg-muted border border-border/40">
            <Image
              src={video.thumbnail_url}
              alt=""
              fill
              sizes="72px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="size-10 sm:size-11 rounded-lg bg-muted/60 border border-border/30 flex items-center justify-center">
            {getItemIcon(item.item_type)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug truncate" title={item.title}>
          {item.title}
        </p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1" title={item.description}>
            {item.description}
          </p>
        )}
        {item.item_type === 'video' && !video && item.video_asset_id && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
            <AlertCircle className="size-3 shrink-0" />
            Video asset unavailable
          </p>
        )}
        {item.item_type === 'video' && video?.processing_status === 'processing' && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
            <Loader2 className="size-3 shrink-0 animate-spin" />
            Processing
          </p>
        )}
        {item.item_type === 'video' && video?.processing_status === 'error' && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="size-3 shrink-0" />
            Processing failed
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5 max-w-[40%] sm:max-w-none">
        <div className="flex flex-wrap justify-end gap-1">
          {item.is_preview && (
            <Badge
              variant="outline"
              className="text-[10px] text-amber-700 border-amber-200/80 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400"
            >
              Preview
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] capitalize font-normal">
            {formatItemTypeLabel(item.item_type)}
          </Badge>
        </div>
        {item.item_type === 'video' && (
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
            {formatDuration(duration)}
          </span>
        )}
      </div>
    </div>
  );
}

export function CourseDetailView({ data }: { data: AssignedCourseDetailData }) {
  const { modules, items, videos, variantInfo } = data;

  const { visibleModules, itemsByModule } = useMemo(() => {
    const variantItemIdsSet = variantInfo ? new Set(variantInfo.variantItemIds) : null;

    const itemsByModule = new Map<string, MasterCourseItemsRow[]>();
    for (const item of items) {
      if (variantItemIdsSet && !variantItemIdsSet.has(item.id)) {
        continue;
      }
      const existing = itemsByModule.get(item.module_id);
      if (existing) {
        existing.push(item);
      } else {
        itemsByModule.set(item.module_id, [item]);
      }
    }

    const visibleModules = variantItemIdsSet
      ? modules.filter((module) => itemsByModule.has(module.id))
      : modules;

    return { visibleModules, itemsByModule };
  }, [modules, items, variantInfo]);

  if (visibleModules.length === 0) {
    return (
      <div className="card-tier-1 rounded-xl px-6 py-14 text-center">
        <Layers className="size-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground/80">No curriculum in this selection yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Modules and lessons will appear here once SuperAdmin publishes content for this course.
        </p>
      </div>
    );
  }

  return (
    <div className="card-tier-1 rounded-xl overflow-hidden">
      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={visibleModules.map((m) => m.id)}
      >
        {visibleModules.map((module, mIndex) => {
          const moduleItems = itemsByModule.get(module.id) ?? [];

          return (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border-b border-border/40 last:border-b-0 px-0"
            >
              <AccordionTrigger className="px-4 sm:px-5 py-4 hover:no-underline hover:bg-muted/25 [&[data-state=open]]:bg-muted/15">
                <div className="flex flex-1 items-start gap-3 text-left min-w-0 pr-2">
                  <span className="shrink-0 inline-flex items-center justify-center size-7 rounded-md bg-primary/10 text-primary text-[11px] font-bold font-mono">
                    {mIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                      {module.title}
                    </p>
                    {module.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 font-normal">
                        {module.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1.5 tabular-nums">
                      {moduleItems.length} lesson{moduleItems.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-0 pt-0">
                <div className="bg-muted/15 border-t border-border/30">
                  {moduleItems.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground italic">
                      No lessons in this module.
                    </p>
                  ) : (
                    moduleItems.map((item, iIndex) => (
                      <LessonRow
                        key={item.id}
                        item={item}
                        index={iIndex}
                        video={item.video_asset_id ? videos[item.video_asset_id] ?? null : null}
                      />
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
