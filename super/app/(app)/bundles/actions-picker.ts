'use server';

/**
 * Server actions for bundle content picker data fetching.
 * Read-only queries to power the bundle item selection UI.
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PickerPillar {
  id: string;
  title: string;
  code: string;
  course_count: number;
}

export interface PickerCourse {
  id: string;
  title: string;
  code: string;
  publish_status: string;
  module_count: number;
  course_source?: 'pillar' | 'paid_course_builder';
}

export interface PickerCourseVariant {
  id: string;
  title: string;
  code: string;
  publish_status: string;
  item_count: number;
}

export interface PickerCourseModule {
  id: string;
  title: string;
  sort_order: number;
  items: PickerCourseItem[];
}

export interface PickerCourseItem {
  id: string;
  title: string;
  item_type: string;
  sort_order: number;
  duration_seconds: number | null;
}

export interface PickerBundle {
  id: string;
  title: string;
  code: string;
  publish_status: string;
  visibility_scope: string;
  item_count: number;
}

export async function fetchPillarsForBundlePicker(): Promise<
  { pillars: PickerPillar[] } | { error: string }
> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from('master_course_pillars')
      .select('id, title, code')
      .order('sort_order', { ascending: true });

    if (error) return { error: error.message };

    const pillarIds = (data ?? []).map((p) => p.id);
    const courseCounts = new Map<string, number>();

    if (pillarIds.length > 0) {
      const { data: courses } = await sb
        .from('master_courses')
        .select('pillar_id')
        .in('pillar_id', pillarIds);

      for (const c of courses ?? []) {
        if (c.pillar_id) {
          courseCounts.set(c.pillar_id, (courseCounts.get(c.pillar_id) ?? 0) + 1);
        }
      }
    }

    return {
      pillars: (data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        code: p.code,
        course_count: courseCounts.get(p.id) ?? 0,
      })),
    };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

export async function fetchCoursesForPillar(
  pillarId: string,
): Promise<{ courses: PickerCourse[] } | { error: string }> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();
    const { data: courses, error } = await sb
      .from('master_courses')
      .select('id, title, code, publish_status')
      .eq('pillar_id', pillarId)
      .order('title', { ascending: true });

    if (error) return { error: error.message };

    const courseIds = (courses ?? []).map((c) => c.id);
    const moduleCounts = new Map<string, number>();

    if (courseIds.length > 0) {
      const { data: mods } = await sb
        .from('master_course_modules')
        .select('master_course_id')
        .in('master_course_id', courseIds);

      for (const m of mods ?? []) {
        moduleCounts.set(m.master_course_id, (moduleCounts.get(m.master_course_id) ?? 0) + 1);
      }
    }

    return {
      courses: (courses ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        code: c.code,
        publish_status: c.publish_status,
        module_count: moduleCounts.get(c.id) ?? 0,
        course_source: 'pillar' as const,
      })),
    };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

export async function fetchPaidCoursesForBundlePicker(
  searchQuery?: string,
): Promise<{ courses: PickerCourse[] } | { error: string }> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();
    const query = sb
      .from('master_courses')
      .select('id, title, code, publish_status, catalog_type, bootcamp_id')
      .eq('publish_status', 'published')
      .or('catalog_type.eq.bootcamp,bootcamp_id.not.is.null')
      .order('title', { ascending: true });

    const { data: courses, error } = await query;
    if (error) return { error: error.message };

    const courseIds = (courses ?? []).map((c) => c.id);
    const moduleCounts = new Map<string, number>();

    if (courseIds.length > 0) {
      const { data: mods } = await sb
        .from('master_course_modules')
        .select('master_course_id')
        .in('master_course_id', courseIds);

      for (const m of mods ?? []) {
        moduleCounts.set(m.master_course_id, (moduleCounts.get(m.master_course_id) ?? 0) + 1);
      }
    }

    if (searchQuery?.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const filtered = (courses ?? []).filter(
        (c) =>
          (c.title as string).toLowerCase().includes(q)
          || (c.code as string).toLowerCase().includes(q),
      );
      return {
        courses: filtered.map((c) => ({
          id: c.id,
          title: c.title,
          code: c.code,
          publish_status: c.publish_status,
          module_count: moduleCounts.get(c.id) ?? 0,
          course_source: 'paid_course_builder' as const,
        })),
      };
    }

    return {
      courses: (courses ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        code: c.code,
        publish_status: c.publish_status,
        module_count: moduleCounts.get(c.id) ?? 0,
        course_source: 'paid_course_builder' as const,
      })),
    };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

export async function fetchCourseDetailsForBundlePicker(
  courseId: string,
): Promise<
  { variants: PickerCourseVariant[]; modules: PickerCourseModule[] } | { error: string }
> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();

    const [
      { data: variants, error: varErr },
      { data: modules, error: modErr },
      { data: items, error: itemErr },
    ] = await Promise.all([
      sb.from('course_variants')
        .select('id, title, code, publish_status')
        .eq('master_course_id', courseId)
        .order('title', { ascending: true }),
      sb.from('master_course_modules')
        .select('id, title, sort_order')
        .eq('master_course_id', courseId)
        .order('sort_order', { ascending: true }),
      sb.from('master_course_items')
        .select('id, title, item_type, sort_order, duration_seconds, module_id')
        .eq('master_course_id', courseId)
        .order('sort_order', { ascending: true }),
    ]);

    if (varErr) return { error: varErr.message };
    if (modErr) return { error: modErr.message };
    if (itemErr) return { error: itemErr.message };

    const variantIds = (variants ?? []).map((v) => v.id);
    const variantItemCounts = new Map<string, number>();

    if (variantIds.length > 0) {
      const { data: viRows } = await sb
        .from('course_variant_items')
        .select('course_variant_id')
        .in('course_variant_id', variantIds);

      for (const vi of viRows ?? []) {
        variantItemCounts.set(vi.course_variant_id, (variantItemCounts.get(vi.course_variant_id) ?? 0) + 1);
      }
    }

    return {
      variants: (variants ?? []).map((v) => ({
        id: v.id,
        title: v.title,
        code: v.code,
        publish_status: v.publish_status,
        item_count: variantItemCounts.get(v.id) ?? 0,
      })),
      modules: (modules ?? []).map((mod) => ({
        id: mod.id,
        title: mod.title,
        sort_order: mod.sort_order,
        items: (items ?? []).reduce<Array<{
          id: string;
          title: string;
          item_type: string;
          sort_order: number;
          duration_seconds: number | null;
        }>>((acc, i) => {
          if (i.module_id === mod.id) {
            acc.push({
              id: i.id,
              title: i.title,
              item_type: i.item_type,
              sort_order: i.sort_order,
              duration_seconds: i.duration_seconds,
            });
          }
          return acc;
        }, []),
      })),
    };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

export async function fetchBundlesForBundlePicker(
  excludeBundleId?: string,
): Promise<{ bundles: PickerBundle[] } | { error: string }> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();

    let query = sb
      .from('course_bundles')
      .select('id, title, code, publish_status, visibility_scope')
      .order('title', { ascending: true });

    if (excludeBundleId) {
      query = query.neq('id', excludeBundleId);
    }

    const { data: bundles, error } = await query;

    if (error) return { error: error.message };

    const bundleIds = (bundles ?? []).map((b) => b.id);
    const itemCounts = new Map<string, number>();

    if (bundleIds.length > 0) {
      const { data: items } = await sb
        .from('bundle_items')
        .select('bundle_id')
        .in('bundle_id', bundleIds);

      for (const item of items ?? []) {
        itemCounts.set(item.bundle_id, (itemCounts.get(item.bundle_id) ?? 0) + 1);
      }
    }

    return {
      bundles: (bundles ?? []).map((b) => ({
        id: b.id,
        title: b.title,
        code: b.code,
        publish_status: b.publish_status,
        visibility_scope: b.visibility_scope ?? 'global',
        item_count: itemCounts.get(b.id) ?? 0,
      })),
    };
} catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

// ─── Bundle Component Lectures ─────────────────────────────────────────────

export interface ComponentLecture {
  id: string;
  title: string;
  item_type: string;
  sort_order: number;
  duration_seconds: number | null;
  module_title: string | null;
  parent_master_course_id: string | null;
}

/**
 * Fetch the available lectures for a bundle component.
 * Used by the selected lecture override editor.
 *
 * - master_course -> all published items from that course
 * - variant -> course_variant_items master_course_item_ids
 * - bundle -> bundle_resolved_items if present, else resolveBundleDraftItems fallback
 * - master_course_item -> that one item
 */
export async function fetchBundleComponentLectures(
  itemType: string,
  referenceId: string,
): Promise<{ lectures: ComponentLecture[] } | { error: string }> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();

    if (itemType === 'master_course') {
      const { data: items, error } = await sb
        .from('master_course_items')
        .select('id, title, item_type, sort_order, duration_seconds, module_id')
        .eq('master_course_id', referenceId)
        .eq('publish_status', 'published')
        .order('sort_order', { ascending: true });

      if (error) return { error: error.message };

      // Get module titles
      const moduleIds = [...new Set((items ?? []).reduce<string[]>((acc, i) => { if (i.module_id) acc.push(i.module_id as string); return acc; }, []))];
      const moduleMap = new Map<string, string>();
      if (moduleIds.length > 0) {
        const { data: modules } = await sb
          .from('master_course_modules')
          .select('id, title')
          .in('id', moduleIds);
        for (const m of modules ?? []) {
          moduleMap.set(m.id as string, m.title as string);
        }
      }

      return {
        lectures: (items ?? []).map((item) => ({
          id: item.id as string,
          title: item.title as string,
          item_type: item.item_type as string,
          sort_order: item.sort_order as number,
          duration_seconds: (item.duration_seconds as number) ?? null,
          module_title: moduleMap.get(item.module_id as string) ?? null,
          parent_master_course_id: referenceId,
        })),
      };
    }

    if (itemType === 'variant') {
      const { data: viRows, error } = await sb
        .from('course_variant_items')
        .select('master_course_item_id, sort_order, master_course_items(id, title, item_type, duration_seconds, module_id, master_course_id)')
        .eq('course_variant_id', referenceId)
        .order('sort_order', { ascending: true });

      if (error) return { error: error.message };

      // Get module titles
      const moduleIds = [...new Set(
        (viRows ?? []).reduce<string[]>((acc, vi) => {
          const mci = vi.master_course_items as unknown as Record<string, unknown> | null;
          const id = mci?.module_id as string;
          if (id) acc.push(id);
          return acc;
        }, []),
      )];
      const moduleMap = new Map<string, string>();
      if (moduleIds.length > 0) {
        const { data: modules } = await sb
          .from('master_course_modules')
          .select('id, title')
          .in('id', moduleIds);
        for (const m of modules ?? []) {
          moduleMap.set(m.id as string, m.title as string);
        }
      }

      return {
        lectures: (viRows ?? []).map((vi) => {
          const item = vi.master_course_items as unknown as Record<string, unknown> | null;
          return {
            id: (item?.id as string) ?? vi.master_course_item_id as string,
            title: (item?.title as string) ?? 'Unknown',
            item_type: (item?.item_type as string) ?? 'unknown',
            sort_order: vi.sort_order as number,
            duration_seconds: (item?.duration_seconds as number) ?? null,
            module_title: moduleMap.get(item?.module_id as string) ?? null,
            parent_master_course_id: (item?.master_course_id as string) ?? null,
          };
        }),
      };
    }

    if (itemType === 'bundle') {
      // First try bundle_resolved_items
      const { data: resolvedRows } = await sb
        .from('bundle_resolved_items')
        .select('master_course_item_id, display_title, sort_order, parent_master_course_id')
        .eq('bundle_id', referenceId)
        .order('sort_order', { ascending: true });

      if (resolvedRows && resolvedRows.length > 0) {
        // Get item details for the resolved IDs
        const itemIds = resolvedRows.map((r) => r.master_course_item_id);
        const { data: items } = await sb
          .from('master_course_items')
          .select('id, title, item_type, duration_seconds, module_id')
          .in('id', itemIds);

        const itemMap = new Map<string, Record<string, unknown>>();
        for (const item of items ?? []) {
          itemMap.set(item.id as string, item as Record<string, unknown>);
        }

        // Get module titles
        const moduleIds = [...new Set((items ?? []).flatMap((i) => i.module_id ? [i.module_id] : []))];
        const moduleMap = new Map<string, string>();
        if (moduleIds.length > 0) {
          const { data: modules } = await sb
            .from('master_course_modules')
            .select('id, title')
            .in('id', moduleIds);
          for (const m of modules ?? []) {
            moduleMap.set(m.id as string, m.title as string);
          }
        }

        return {
          lectures: resolvedRows.map((r) => {
            const item = itemMap.get(r.master_course_item_id);
            return {
              id: r.master_course_item_id as string,
              title: (r.display_title as string) ?? (item?.title as string) ?? 'Unknown',
              item_type: (item?.item_type as string) ?? 'unknown',
              sort_order: r.sort_order as number,
              duration_seconds: (item?.duration_seconds as number) ?? null,
              module_title: moduleMap.get(item?.module_id as string) ?? null,
              parent_master_course_id: r.parent_master_course_id as string,
            };
          }),
        };
      }

      // Fallback: resolve using catalog-effective-access
      const { resolveBundleDraftItems } = await import('@/lib/services/catalog-effective-access');
      const draftItems = await resolveBundleDraftItems(referenceId);

      if (draftItems.length === 0) {
        return { lectures: [] };
      }

      // Get item details
      const itemIds = draftItems.map((di) => di.masterCourseItemId);
      const { data: items } = await sb
        .from('master_course_items')
        .select('id, title, item_type, duration_seconds, module_id')
        .in('id', itemIds);

      const itemMap = new Map<string, Record<string, unknown>>();
      for (const item of items ?? []) {
        itemMap.set(item.id as string, item as Record<string, unknown>);
      }

      // Get module titles
      const moduleIds = [...new Set((items ?? []).flatMap((i) => i.module_id ? [i.module_id] : []))];
      const moduleMap = new Map<string, string>();
      if (moduleIds.length > 0) {
        const { data: modules } = await sb
          .from('master_course_modules')
          .select('id, title')
          .in('id', moduleIds);
        for (const m of modules ?? []) {
          moduleMap.set(m.id as string, m.title as string);
        }
      }

      return {
        lectures: draftItems.map((di) => {
          const item = itemMap.get(di.masterCourseItemId);
          return {
            id: di.masterCourseItemId,
            title: di.displayTitle ?? (item?.title as string) ?? 'Unknown',
            item_type: (item?.item_type as string) ?? 'unknown',
            sort_order: di.sortOrder,
            duration_seconds: (item?.duration_seconds as number) ?? null,
            module_title: moduleMap.get(item?.module_id as string) ?? null,
            parent_master_course_id: di.parentMasterCourseId,
          };
        }),
      };
    }

    if (itemType === 'master_course_item') {
      const { data: item, error } = await sb
        .from('master_course_items')
        .select('id, title, item_type, sort_order, duration_seconds, module_id, master_course_id')
        .eq('id', referenceId)
        .single();

      if (error || !item) return { error: error?.message ?? 'Item not found' };

      let moduleTitle: string | null = null;
      if (item.module_id) {
        const { data: mod } = await sb
          .from('master_course_modules')
          .select('title')
          .eq('id', item.module_id)
          .single();
        moduleTitle = (mod?.title as string) ?? null;
      }

      return {
        lectures: [{
          id: item.id as string,
          title: item.title as string,
          item_type: item.item_type as string,
          sort_order: item.sort_order as number,
          duration_seconds: (item.duration_seconds as number) ?? null,
          module_title: moduleTitle,
          parent_master_course_id: item.master_course_id as string,
        }],
      };
    }

    return { lectures: [] };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

/**
 * Get component metadata (title, type) for display in the bundle items table.
 */
export async function fetchBundleComponentLabels(
  items: Array<{ item_type: string; reference_id: string }>,
): Promise<{ labels: Record<string, { title: string; subtitle?: string }> } | { error: string }> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();
    const labels: Record<string, { title: string; subtitle?: string }> = {};

    const mcIds: string[] = [];
    const variantIds: string[] = [];
    const bundleIds: string[] = [];
    const itemIds: string[] = [];
    for (const i of items) {
      if (i.item_type === 'master_course') mcIds.push(i.reference_id);
      else if (i.item_type === 'variant') variantIds.push(i.reference_id);
      else if (i.item_type === 'bundle') bundleIds.push(i.reference_id);
      else if (i.item_type === 'master_course_item') itemIds.push(i.reference_id);
    }

    if (mcIds.length > 0) {
      const { data } = await sb
        .from('master_courses')
        .select('id, title, catalog_type, bootcamp_id')
        .in('id', mcIds);
      for (const d of data ?? []) {
        const isPaidBuilder = d.catalog_type === 'bootcamp' || !!d.bootcamp_id;
        labels[`master_course:${d.id}`] = {
          title: d.title as string,
          subtitle: isPaidBuilder ? 'Paid Course' : 'Pillar Course',
        };
      }
    }
    if (variantIds.length > 0) {
      const { data } = await sb.from('course_variants').select('id, title').in('id', variantIds);
      for (const d of data ?? []) labels[`variant:${d.id}`] = { title: d.title as string };
    }
    if (bundleIds.length > 0) {
      const { data } = await sb.from('course_bundles').select('id, title').in('id', bundleIds);
      for (const d of data ?? []) labels[`bundle:${d.id}`] = { title: d.title as string, subtitle: 'Nested Bundle' };
    }
    if (itemIds.length > 0) {
      const { data } = await sb.from('master_course_items').select('id, title').in('id', itemIds);
      for (const d of data ?? []) labels[`master_course_item:${d.id}`] = { title: d.title as string };
    }

    return { labels };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}
