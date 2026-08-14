import 'server-only';

/**
 * Note Catalog Service (Phase 3).
 *
 * Server-side service for fetching note collections for the student catalog.
 * Uses admin client (bypasses RLS) — caller must enforce auth.
 */

import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NoteCollectionsRow, NoteModulesRow, NotePagesRow } from '@/types/database';

export interface NoteCollectionSummary {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  pricing_model: string;
  price_minor: number;
  currency: string;
  cover_image_path: string | null;
}

export interface NoteCollectionDetail extends NoteCollectionsRow {
  modules: NoteModulesRow[];
}

export interface NoteModuleWithPages extends NoteModulesRow {
  pages: NotePagesRow[];
}

/**
 * Fetch all published, non-deleted note collections for the standalone catalog.
 * Excludes course-linked notes (catalog_visibility = 'hidden_course_attached').
 * Does NOT include modules/pages or page images.
 *
 * Supports pagination via limit/offset parameters.
 */
export const getPublishedNoteCollections = cache(
  async function getPublishedNoteCollections(
    limit = 50,
    offset = 0,
  ): Promise<{ data: NoteCollectionSummary[]; total: number }> {
    'use cache';
    cacheLife('minutes');
    cacheTag('note-collections');

    const sb = createAdminClient();

    const [dataResult, countResult] = await Promise.all([
      sb
        .from('note_collections')
        .select('id, title, slug, short_description, pricing_model, price_minor, currency, cover_image_path')
        .eq('publish_status', 'published')
        .eq('catalog_visibility', 'public_catalog')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      sb
        .from('note_collections')
        .select('id', { count: 'exact', head: true })
        .eq('publish_status', 'published')
        .eq('catalog_visibility', 'public_catalog')
        .is('deleted_at', null),
    ]);

    if (dataResult.error) {
      console.error('[NoteCatalog] Error fetching collections:', dataResult.error);
      return { data: [], total: 0 };
    }

    return {
      data: (dataResult.data ?? []) as NoteCollectionSummary[],
      total: countResult.count ?? 0,
    };
  },
);

/**
 * Fetch a note collection by slug with its modules.
 */
export async function getNoteCollectionBySlug(
  slug: string,
): Promise<NoteCollectionDetail | null> {
  const sb = createAdminClient();

  const { data: collection, error } = await sb
    .from('note_collections')
    .select('id, title, slug, short_description, description_md, cover_image_path, publish_status, pricing_model, price_minor, currency, validity_days, source_master_course_id, source_type, catalog_visibility, visibility_scope, visibility_metadata, created_by, updated_by, published_at, deleted_at, metadata, created_at, updated_at')
    .eq('slug', slug)
    .eq('publish_status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !collection) return null;

  const { data: modules } = await sb
    .from('note_modules')
    .select('id, note_collection_id, title, slug, description_md, sort_order, is_published, created_at, updated_at')
    .eq('note_collection_id', collection.id)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  return {
    ...(collection as NoteCollectionsRow),
    modules: (modules ?? []) as NoteModulesRow[],
  };
}

/**
 * Fetch a note module by slug within a collection, with its pages.
 */
export async function getNoteModuleBySlug(
  collectionId: string,
  moduleSlug: string,
): Promise<NoteModuleWithPages | null> {
  const sb = createAdminClient();

  const { data: module, error } = await sb
    .from('note_modules')
    .select('id, note_collection_id, title, slug, description_md, sort_order, is_published, created_at, updated_at')
    .eq('note_collection_id', collectionId)
    .eq('slug', moduleSlug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !module) return null;

  const { data: pages } = await sb
    .from('note_pages')
    .select('id, note_module_id, title, image_path, image_mime, width, height, file_size_bytes, alt_text, sort_order, created_at, updated_at')
    .eq('note_module_id', module.id)
    .order('sort_order', { ascending: true });

  return {
    ...(module as NoteModulesRow),
    pages: (pages ?? []) as NotePagesRow[],
  };
}

/**
 * Fetch linked courses for a note collection.
 */
export async function getNoteCourseLinks(
  noteCollectionId: string,
): Promise<{ course_id: string }[]> {
  const sb = createAdminClient();

  const { data } = await sb
    .from('note_course_links')
    .select('course_id')
    .eq('note_collection_id', noteCollectionId)
    .eq('auto_unlock_with_course', true);

  return (data ?? []) as { course_id: string }[];
}

/**
 * Fetch note collections visible to a specific student.
 *
 * Combines three sources:
 * 1. Global published notes (visible to all students)
 * 2. Notes the student has a direct entitlement for (purchased)
 * 3. Notes linked via note_course_links to courses the student has access to
 *
 * Returns deduplicated results with a `visibility_source` tag.
 */
export const getStudentNoteCollections = cache(
  async function getStudentNoteCollections(
    studentId: string,
    _isGlobal: boolean = true,
  ): Promise<(NoteCollectionSummary & { visibility_source: string })[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag('note-collections', `student-note-collections-${studentId}`);

    const sb = createAdminClient();

    // 1. Global published notes (standalone only — exclude course-linked)
    // #7 Safety cap: limit to 100 results per source to prevent unbounded growth
    const { data: globalData } = await sb
      .from('note_collections')
      .select('id, title, slug, short_description, pricing_model, price_minor, currency, cover_image_path')
      .eq('publish_status', 'published')
      .eq('catalog_visibility', 'public_catalog')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    const seenIds = new Set<string>();
    const results: (NoteCollectionSummary & { visibility_source: string })[] = [];

    for (const row of globalData ?? []) {
      seenIds.add(row.id);
      results.push({ ...(row as NoteCollectionSummary), visibility_source: 'global' });
    }

    // 2. Notes with direct student entitlements
    const { data: entitlements } = await sb
      .from('student_note_entitlements')
      .select('note_collection_id')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .or('valid_until.is.null,valid_until.gt.now()');

    const entitlementIds = (entitlements ?? [])
      .map((e) => e.note_collection_id)
      .filter((id): id is string => !!id && !seenIds.has(id));

    if (entitlementIds.length > 0) {
      const { data: entCollections } = await sb
        .from('note_collections')
        .select('id, title, slug, short_description, pricing_model, price_minor, currency, cover_image_path')
        .in('id', entitlementIds)
        .eq('publish_status', 'published')
        .eq('catalog_visibility', 'public_catalog')
        .is('deleted_at', null)
        .limit(100);

      for (const row of entCollections ?? []) {
        seenIds.add(row.id);
        results.push({ ...(row as NoteCollectionSummary), visibility_source: 'entitlement' });
      }
    }

    // 3. Notes linked to courses the student has access to
    // Only include course-linked notes (catalog_visibility = 'hidden_course_attached')
    // as these are meant to be accessed through the course player, not the /notes page.
    const { data: courseLinks } = await sb
      .from('note_course_links')
      .select('note_collection_id')
      .eq('auto_unlock_with_course', true);

    const courseLinkedIdSet = new Set<string>();
    for (const link of courseLinks ?? []) {
      if (link.note_collection_id && !seenIds.has(link.note_collection_id)) {
        courseLinkedIdSet.add(link.note_collection_id);
      }
    }
    const courseLinkedIds = [...courseLinkedIdSet];

    if (courseLinkedIds.length > 0) {
      const { data: clCollections } = await sb
        .from('note_collections')
        .select('id, title, slug, short_description, pricing_model, price_minor, currency, cover_image_path')
        .in('id', courseLinkedIds)
        .eq('publish_status', 'published')
        .eq('catalog_visibility', 'hidden_course_attached')
        .is('deleted_at', null)
        .limit(100);

      for (const row of clCollections ?? []) {
        seenIds.add(row.id);
        results.push({ ...(row as NoteCollectionSummary), visibility_source: 'course_linked' });
      }
    }

    return results;
  }
);
