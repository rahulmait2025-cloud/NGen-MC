/**
 * Server-only: fetch tenant branding from DB. Do not import from client components.
 */
import 'server-only';
import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { TenantBranding } from '@/types/tenant';

async function getTenantBrandingCached(slug: string): Promise<TenantBranding | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('tenant-branding');
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('colleges')
    .select('id, name, slug, short_name, logo_url, primary_color, secondary_color')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    shortName: data.short_name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    batchLabel: null,
    programLabel: null,
  };
}

const getTenantBrandingFromDb = cache(async function getTenantBrandingFromDb(slug: string): Promise<TenantBranding | null> {
  return getTenantBrandingCached(slug);
});

/** Async getTenantBranding for use in Server Components. */
export async function getTenantBranding(slug?: string | null): Promise<TenantBranding | null> {
  if (!slug || slug === 'default') return null;
  return getTenantBrandingFromDb(slug);
}
