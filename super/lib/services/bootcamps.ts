import 'server-only';

/**
 * Bootcamps Service.
 *
 * Manages the B2C Bootcamp catalog container.
 *
 * The bootcamp is a single canonical container in the UI. The API surface:
 *  - listBootcamps      (used by routing/redirects)
 *  - getBootcampById    (used by routing)
 *  - getBootcampBySlug  (used by routing)
 *  - createBootcamp     (used by the /bootcamps UI to provision the
 *                        canonical bootcamp when none exists)
 */

import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  BootcampsRow,
  BootcampPublishStatus,
} from '@/types/database';

export interface CreateBootcampInput {
  code: string;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string;
  cover_image_url?: string;
  sort_order?: number;
  publish_status?: BootcampPublishStatus;
  created_by?: string;
}

/**
 * Normalize a string into a URL-safe slug.
 */
function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * List all Bootcamps ordered by sort_order, then title.
 *
 * Cached via the `use cache` directive (Next.js 16 Cache Components).
 * Revalidate after 60s; tag for on-demand invalidation from mutations.
 */
export async function listBootcamps(): Promise<BootcampsRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('bootcamps');

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('bootcamps')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw new Error(`Failed to list Bootcamps: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get a single Bootcamp by ID.
 */
export async function getBootcampById(id: string): Promise<BootcampsRow | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return null;
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('bootcamps')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch Bootcamp: ${error.message}`);
  }

  return data;
}

/**
 * Get a single Bootcamp by slug.
 */
async function _getBootcampBySlug(slug: string): Promise<BootcampsRow | null> {
  if (!slug) return null;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('bootcamps')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch Bootcamp by slug: ${error.message}`);
  }

  return data;
}

/**
 * Create a new Bootcamp.
 *
 * Used by the /bootcamps page to provision the canonical Bootcamp when
 * none exists. The UI enforces single-bootcamp semantics by redirecting
 * to the existing bootcamp if one already exists.
 */
export async function createBootcamp(input: CreateBootcampInput): Promise<BootcampsRow> {
  const admin = createAdminClient();

  const slug = normalizeSlug(input.slug || input.title);
  const code = input.code;

  // Check for duplicate code
  const { data: existingByCode } = await admin
    .from('bootcamps')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existingByCode) {
    throw new Error(`A Bootcamp with code "${code}" already exists.`);
  }

  // Check for duplicate slug
  const { data: existingBySlug } = await admin
    .from('bootcamps')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existingBySlug) {
    throw new Error(`A Bootcamp with slug "${slug}" already exists.`);
  }

  const { data: bootcamp, error: insertError } = await admin
    .from('bootcamps')
    .insert({
      code,
      title: input.title,
      slug,
      description: input.description ?? null,
      short_description: input.short_description ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      cover_image_url: input.cover_image_url ?? null,
      sort_order: input.sort_order ?? 0,
      publish_status: input.publish_status ?? 'draft',
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (insertError || !bootcamp) {
    throw new Error(`Failed to create Bootcamp: ${insertError?.message ?? 'No data'}`);
  }

  return bootcamp;
}
