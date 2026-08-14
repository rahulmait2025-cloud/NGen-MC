/**
 * Server-only: fetch tenant branding from DB. Do not import from client components.
 */
import 'server-only';
import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TenantBranding } from '@/types/tenant';

export function buildFallbackTenantBranding(slug: string): TenantBranding {
  const normalized = slug.trim();
  const title = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return {
    id: normalized,
    name: title,
    slug: normalized,
    shortName: title,
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
  };
}

async function getTenantBrandingCached(slug: string): Promise<TenantBranding | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('lms-tenant-branding');
  if (!slug || slug === 'default') {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('colleges')
    .select('id, name, slug, short_name, logo_url, primary_color, secondary_color')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[tenant-branding] lookup failed:', error.message);
    }
    return buildFallbackTenantBranding(slug);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    shortName: data.short_name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
  };
}

async function collegeSlugExistsCached(slug: string): Promise<boolean> {
  'use cache';
  cacheLife('minutes');
  cacheTag('lms-tenant-branding');
  if (!slug || slug === 'default') return false;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('colleges')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[tenant-branding] existence check failed:', error.message);
    }
    return true;
  }
  return !!data;
}

const getTenantBrandingFromDb = cache(async function getTenantBrandingFromDb(slug: string): Promise<TenantBranding | null> {
  return getTenantBrandingCached(slug);
});

/** Async getTenantBranding for use in Server Components. */
export async function getTenantBranding(slug?: string | null): Promise<TenantBranding | null> {
  if (!slug || slug === 'default') return null;
  return getTenantBrandingFromDb(slug);
}

/**
 * Resolve branding for /c/[collegeSlug]/student/* layouts.
 * Only returns exists=false when the slug is not an active college (true 404).
 */
export async function resolveStudentPortalBranding(
  slug: string,
): Promise<{ branding: TenantBranding; exists: boolean }> {
  const normalized = slug.trim();
  if (!normalized || normalized === 'default') {
    return { branding: buildFallbackTenantBranding('default'), exists: false };
  }

  const branding = (await getTenantBranding(normalized)) ?? buildFallbackTenantBranding(normalized);
  const exists = await collegeSlugExistsCached(normalized);
  return { branding, exists };
}
