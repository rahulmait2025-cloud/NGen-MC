'use client';

import React from 'react';
import { Video, FileText } from 'lucide-react';

export type ModuleVideoItem = {
  id: string;
  title: string;
  slug: string;
  item_type: string;
  sort_order: number;
  publish_status: string;
};

export type SummaryCounts = {
  videos: number;
  notes: { total: number; published: number; draft: number };
  excalidraw: { total: number; published: number; hidden: number };
};

export type ModuleSummary = {
  id: string;
  title: string;
  sort_order: number;
  videoCount: number;
  notesCount: { total: number; published: number; draft: number };
  excalidrawCount: { total: number; published: number; hidden: number };
};

export type LinkedNoteInfo = {
  link_id: string;
  note_collection_id: string;
  course_id: string;
  module_id: string | null;
  item_id: string | null;
  auto_unlock_with_course: boolean;
  note_title: string;
  note_slug: string;
  note_publish_status: string;
};

export type ExcalidrawResourceInfo = {
  resource_item_id: string;
  title: string;
  subtitle: string | null;
  excalidraw_url: string | null;
  excalidraw_scene_json: Record<string, unknown> | null;
  section_id: string;
  is_visible: boolean;
};

export type DeepDeletePreviewInfo = {
  title: string;
  sourceType: string;
  moduleCount: number;
  pageCount: number;
  linkCount: number;
  excalidrawResourceCount: number;
  linkedScopes: Array<{
    linkId: string;
    courseId: string;
    courseTitle: string;
    courseCode: string | null;
    moduleId: string | null;
    moduleTitle: string | null;
    itemId: string | null;
    itemTitle: string | null;
  }>;
};

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getItemTypeIcon(type: string) {
  switch (type) {
    case 'video':
      return React.createElement(Video, { className: "size-3" });
    case 'quiz':
      return React.createElement(FileText, { className: "size-3" });
    default:
      return React.createElement(FileText, { className: "size-3" });
  }
}

export function getItemTypeBadgeClass(type: string): string {
  switch (type) {
    case 'video':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
    case 'quiz':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400';
    case 'lesson':
      return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300';
  }
}
