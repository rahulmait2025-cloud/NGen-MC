import 'server-only';

/**
 * Course Player Resources Service (Phase 3).
 *
 * Fetches course-level, module-level, and item-level resource sections
 * and items for the Resources tab.
 * Server-side only — no client-side Supabase reads.
 *
 * PERFORMANCE: Single query pattern using nested select to avoid per-item queries.
 * Cached at request level via React cache() deduplication.
 */

import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CourseResourceSectionWithItems } from '@/types/database';

/**
 * Fetch all visible course resource sections and their items for a course.
 *
 * Returns sections sorted by sort_order, each with nested items sorted by sort_order.
 * Only returns visible sections and items (is_visible = true).
 * Includes:
 *  - global sections (visibility = 'global') that apply to all courses
 *  - course-level sections (scope_type = 'course', module_id IS NULL, item_id IS NULL)
 *  - module-level sections (scope_type = 'module', module_id IS NOT NULL, item_id IS NULL)
 *  - item-level sections (scope_type = 'item', module_id IS NOT NULL, item_id IS NOT NULL)
 *
 * Uses a single Supabase query with nested select to avoid N+1 queries.
 */
export const getCourseResourceSections = cache(
  async function getCourseResourceSections(
    courseId: string,
  ): Promise<CourseResourceSectionWithItems[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`course:${courseId}:resources`);

    const sb = createAdminClient();

    const { data: sections, error } = await sb
      .from('course_resource_sections')
      .select(`
        id,
        title,
        icon,
        sort_order,
        visibility,
        scope_type,
        module_id,
        item_id,
        course_resource_items (
          id,
          kind,
          title,
          subtitle,
          icon,
          external_url,
          note_collection_id,
          excalidraw_url,
          open_in_new_tab,
          sort_order,
          is_visible
        )
      `)
      .or(`course_id.eq.${courseId},visibility.eq.global`)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[CoursePlayerResources] Error fetching sections:', error);
      return [];
    }

    if (!sections || sections.length === 0) return [];

    return sections.map((section) => ({
      id: section.id as string,
      title: section.title as string,
      icon: section.icon as string | null,
      sort_order: section.sort_order as number,
      scope_type: section.scope_type as string,
      module_id: section.module_id as string | null,
      item_id: section.item_id as string | null,
      items: ((section.course_resource_items as unknown as Array<{
        id: string;
        kind: string;
        title: string;
        subtitle: string | null;
        icon: string | null;
        external_url: string | null;
        note_collection_id: string | null;
        excalidraw_url: string | null;
        open_in_new_tab: boolean;
        sort_order: number;
        is_visible: boolean;
      }>) || [])
        .filter((item) => item.is_visible)
        .filter((item) => item.kind !== 'file_link' || item.external_url)
        .map((item) => ({
          id: item.id,
          kind: item.kind as CourseResourceSectionWithItems['items'][number]['kind'],
          title: item.title,
          subtitle: item.subtitle,
          icon: item.icon,
          external_url: item.external_url,
          note_collection_id: item.note_collection_id,
          excalidraw_url: item.excalidraw_url,
          open_in_new_tab: item.open_in_new_tab,
          sort_order: item.sort_order,
          is_visible: item.is_visible,
        }))
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  },
);
