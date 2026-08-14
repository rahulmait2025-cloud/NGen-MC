'use client';

import {
  ExternalLink,
  FileText,
  StickyNote,
  BookOpen,
  Link2,
  PenTool,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import type { CourseResourceItemKind, CourseResourceSectionWithItems } from '@/types/database';

interface CoursePlayerResourcesTabProps {
  sections: CourseResourceSectionWithItems[];
  collegeSlug?: string;
  noteCollectionSlugMap?: Record<string, string>;
  activeModuleId?: string | null;
  activeItemId?: string | null;
  courseId?: string;
  className?: string;
}

type ResourceItem = CourseResourceSectionWithItems['items'][number];

type ResolvedResource = {
  item: ResourceItem;
  href: string | null;
  external: boolean;
  openInNewTab: boolean;
  clickable: boolean;
  pendingLabel: string | null;
};

/**
 * Filter resource sections relevant to the currently active item.
 * Pure function — no server dependencies.
 */
function filterSectionsForActiveItem(
  sections: CourseResourceSectionWithItems[],
  activeModuleId?: string | null,
  activeItemId?: string | null,
): CourseResourceSectionWithItems[] {
  return sections.filter((section) => {
    if (!section.scope_type || section.scope_type === 'global') return true;
    if (section.scope_type === 'course' && !section.module_id && !section.item_id) return true;
    if (section.scope_type === 'module' && section.module_id && !section.item_id) {
      return activeModuleId != null && section.module_id === activeModuleId;
    }
    if (section.scope_type === 'item' && section.item_id) {
      return activeItemId != null && section.item_id === activeItemId;
    }
    return false;
  });
}

function getItemIcon(kind: CourseResourceItemKind) {
  const iconClass = 'size-4 shrink-0';
  switch (kind) {
    case 'external_link':
      return <ExternalLink className={cn(iconClass, 'text-primary')} aria-hidden />;
    case 'note_collection':
      return <StickyNote className={cn(iconClass, 'text-amber-600 dark:text-amber-400')} aria-hidden />;
    case 'markdown_text':
      return <FileText className={cn(iconClass, 'text-sky-600 dark:text-sky-400')} aria-hidden />;
    case 'file_link':
      return <Link2 className={cn(iconClass, 'text-emerald-600 dark:text-emerald-400')} aria-hidden />;
    case 'excalidraw_link':
      return <PenTool className={cn(iconClass, 'text-sky-600 dark:text-sky-400')} aria-hidden />;
    default:
      return <FileText className={cn(iconClass, 'text-muted-foreground')} aria-hidden />;
  }
}

function getKindLabel(kind: CourseResourceItemKind) {
  switch (kind) {
    case 'external_link':
      return 'Link';
    case 'note_collection':
      return 'Notes';
    case 'markdown_text':
      return 'Document';
    case 'file_link':
      return 'File';
    case 'excalidraw_link':
      return 'Whiteboard';
    default:
      return 'Resource';
  }
}

function resolveResourceItem(
  item: ResourceItem,
  collegeSlug?: string,
  noteCollectionSlugMap: Record<string, string> = {},
  courseId?: string,
): ResolvedResource {
  const isExternalLink = item.kind === 'external_link' && Boolean(item.external_url?.trim());
  const isFileLink = item.kind === 'file_link' && Boolean(item.external_url?.trim());
  const isNoteCollection = item.kind === 'note_collection';
  const isExcalidraw = item.kind === 'excalidraw_link';
  const noteSlug = isNoteCollection && item.note_collection_id
    ? noteCollectionSlugMap[item.note_collection_id]
    : null;
  const isNoteLinkable = Boolean(isNoteCollection && noteSlug && collegeSlug);
  const isExcalidrawLinkable = Boolean(isExcalidraw && item.excalidraw_url && collegeSlug && courseId);

  let href: string | null = null;
  let external = false;
  let openInNewTab = false;

  if (isExternalLink || isFileLink) {
    href = item.external_url!.trim();
    external = true;
    openInNewTab = item.open_in_new_tab !== false;
  } else if (isNoteLinkable) {
    href = `/c/${collegeSlug}/student/notes/${noteSlug}`;
  } else if (isExcalidrawLinkable) {
    href = `/c/${collegeSlug}/student/excalidraw/${item.id}`;
    openInNewTab = true;
  }

  let pendingLabel: string | null = null;
  if (isNoteCollection && !isNoteLinkable) pendingLabel = 'Coming soon';
  if (isExcalidraw && !isExcalidrawLinkable) pendingLabel = 'Unavailable';
  if ((item.kind === 'external_link' || item.kind === 'file_link') && !href) {
    pendingLabel = 'No link';
  }

  return {
    item,
    href,
    external,
    openInNewTab,
    clickable: Boolean(href),
    pendingLabel,
  };
}

function groupSectionsByScope(
  sections: CourseResourceSectionWithItems[],
  activeModuleId?: string | null,
  activeItemId?: string | null,
): { label: string; sections: CourseResourceSectionWithItems[] }[] {
  const filtered = filterSectionsForActiveItem(sections, activeModuleId, activeItemId)
    // Never render orphan section titles with zero items
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.title?.trim()),
    }))
    .filter((section) => section.items.length > 0);

  const groups: Record<string, CourseResourceSectionWithItems[]> = {};

  for (const section of filtered) {
    let groupKey: string;
    if (!section.scope_type || section.scope_type === 'global') {
      groupKey = 'Global';
    } else if (section.scope_type === 'course' && !section.module_id && !section.item_id) {
      groupKey = 'Course';
    } else if (section.scope_type === 'module' && section.module_id && !section.item_id) {
      groupKey = 'Module';
    } else if (section.scope_type === 'item' && section.item_id) {
      groupKey = 'This Lesson';
    } else {
      groupKey = 'Course';
    }

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(section);
  }

  const order = ['This Lesson', 'Module', 'Course', 'Global'];
  return order
    .filter((key) => groups[key]?.length)
    .map((key) => ({ label: key, sections: groups[key] }));
}

function ResourceRow({ resolved }: { resolved: ResolvedResource }) {
  const { item, href, external, openInNewTab, clickable, pendingLabel } = resolved;

  const content = (
    <>
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border',
          clickable
            ? 'border-primary/15 bg-primary/5 text-primary'
            : 'border-border/50 bg-muted/40 text-muted-foreground',
        )}
      >
        {item.icon ? (
          <span className="text-sm leading-none" aria-hidden>
            {item.icon}
          </span>
        ) : (
          getItemIcon(item.kind)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.title}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
          {item.subtitle?.trim() || getKindLabel(item.kind)}
        </p>
      </div>

      {pendingLabel ? (
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {pendingLabel}
        </span>
      ) : clickable ? (
        <ExternalLink
          className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden
        />
      ) : null}
    </>
  );

  const rowClass = cn(
    'group flex min-h-11 items-center gap-3 px-3 py-2.5 transition-colors duration-150 ease-out',
    'motion-reduce:transition-none',
    clickable
      ? 'hover:bg-primary/[0.04] focus-visible:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40'
      : 'opacity-70',
  );

  if (clickable && href) {
    if (external) {
      return (
        <a
          href={href}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
          className={rowClass}
          aria-label={`Open ${item.title}`}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className={rowClass}
        aria-label={`Open ${item.title}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={rowClass} aria-disabled="true">
      {content}
    </div>
  );
}

export function CoursePlayerResourcesTab({
  sections,
  collegeSlug,
  noteCollectionSlugMap = {},
  activeModuleId,
  activeItemId,
  courseId,
  className,
}: CoursePlayerResourcesTabProps) {
  const groups = groupSectionsByScope(sections, activeModuleId, activeItemId);
  const showScopeLabels = groups.length > 1 || (groups[0] && groups[0].label !== 'Course');

  if (groups.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<BookOpen />}
          title="No resources yet"
          description="Links, notes, and files for this lesson will show up here when your instructor adds them."
          className="py-10"
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {groups.map((group) => (
        <section key={group.label} className="space-y-3" aria-label={`${group.label} resources`}>
          {showScopeLabels && (
            <h4 className="text-xs font-semibold text-muted-foreground">
              {group.label}
            </h4>
          )}

          <div className="space-y-4">
            {group.sections.map((section) => {
              const resolvedItems = section.items.map((item) =>
                resolveResourceItem(item, collegeSlug, noteCollectionSlugMap, courseId),
              );

              return (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3 px-0.5">
                    <h3 className="min-w-0 truncate text-sm font-bold text-foreground">
                      {section.icon ? (
                        <span className="mr-1.5" aria-hidden>
                          {section.icon}
                        </span>
                      ) : null}
                      {section.title}
                    </h3>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {resolvedItems.length} {resolvedItems.length === 1 ? 'link' : 'links'}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border/60 bg-card divide-y divide-border/40">
                    {resolvedItems.map((resolved) => (
                      <ResourceRow key={resolved.item.id} resolved={resolved} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
