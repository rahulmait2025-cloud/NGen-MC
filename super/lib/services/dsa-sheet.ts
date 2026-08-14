import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DsaSheetWithData,
  DsaSheet,
  DsaCategoryWithProblems,
  DsaProblem,
  DsaCategory,
  DsaDraftStatus,
  DsaAnalytics,
  DsaSheetResource,
  DsaSheetResourceType,
} from '@/types/dsa';

const TRUSTED_IFRAME_HOSTS = new Set(['link.excalidraw.com', 'excalidraw.com', 'www.excalidraw.com']);

function isExcalidrawResourceUrl(url: URL): boolean {
  if (url.hostname === 'link.excalidraw.com' && url.pathname.toLowerCase().startsWith('/readonly/')) {
    return true;
  }

  return (
    (url.hostname === 'excalidraw.com' || url.hostname === 'www.excalidraw.com') &&
    url.hash.toLowerCase().startsWith('#json=')
  );
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === 'PGRST204' &&
    typeof maybeError.message === 'string' &&
    maybeError.message.includes(`'${columnName}' column`)
  );
}

function normalizeGithubBlobUrl(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const blobIndex = parts.indexOf('blob');
  if (url.hostname !== 'github.com' || blobIndex < 2 || parts.length <= blobIndex + 2) {
    return url.toString();
  }

  const owner = parts[0];
  const repo = parts[1];
  const branch = parts[blobIndex + 1];
  const filePath = parts.slice(blobIndex + 2).join('/');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

function inferDsaSheetResourceType(resourceUrl: string, requestedType: DsaSheetResourceType): DsaSheetResourceType {
  if (requestedType !== 'auto') return requestedType;

  const url = new URL(resourceUrl);
  const pathname = url.pathname.toLowerCase();
  if (isExcalidrawResourceUrl(url)) return 'excalidraw';
  if (pathname.endsWith('.svg')) return 'svg';
  if (/\.(png|jpe?g|webp|gif)$/i.test(pathname)) return 'image';
  return 'iframe';
}

function normalizeDsaSheetResourceInput(
  rawUrl: string,
  requestedType: DsaSheetResourceType = 'auto',
): { resource_url: string; resource_type: DsaSheetResourceType } {
  const trimmed = rawUrl.trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'https:') {
    throw new Error('Resource URL must use HTTPS');
  }

  const normalizedUrl = normalizeGithubBlobUrl(parsed);
  const normalizedParsed = new URL(normalizedUrl);
  const resource_type = inferDsaSheetResourceType(normalizedUrl, requestedType);

  if ((resource_type === 'iframe' || resource_type === 'excalidraw') && !TRUSTED_IFRAME_HOSTS.has(normalizedParsed.hostname)) {
    throw new Error('Iframe resources are only allowed from trusted hosts');
  }

  return { resource_url: normalizedUrl, resource_type };
}

async function listDsaSheetResourcesInternal(
  sheetId: string,
  visibleOnly: boolean,
): Promise<DsaSheetResource[]> {
  const admin = createAdminClient();
  let query = admin
    .from('dsa_sheet_resources')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('sort_order', { ascending: true });

  if (visibleOnly) query = query.eq('is_visible', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DsaSheetResource[];
}

// ─── Sheet CRUD ──────────────────────────────────────────────

export async function createDsaSheet(title: string, description_md: string = ''): Promise<DsaSheet> {
  const admin = createAdminClient();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await admin
    .from('dsa_sheets')
    .insert({ title, slug, description_md, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listDsaSheets(): Promise<(DsaSheet & { student_count: number; category_count: number; problem_count: number })[]> {
  const admin = createAdminClient();
  const { data: sheets, error } = await admin
    .from('dsa_sheets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const sheetsWithCounts = await Promise.all(
    sheets.map(async (sheet) => {
      const { count: studentCount } = await admin
        .from('dsa_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('sheet_id', sheet.id);

      const { count: categoryCount } = await admin
        .from('dsa_categories')
        .select('*', { count: 'exact', head: true })
        .eq('sheet_id', sheet.id);

      let problemCount = 0;
      if (categoryCount && categoryCount > 0) {
        const { data: cats } = await admin
          .from('dsa_categories')
          .select('id')
          .eq('sheet_id', sheet.id);
        if (cats && cats.length > 0) {
          const { count: probCount } = await admin
            .from('dsa_problems')
            .select('*', { count: 'exact', head: true })
            .in('category_id', cats.map(c => c.id));
          problemCount = probCount || 0;
        }
      }

      return {
        ...sheet,
        student_count: studentCount || 0,
        category_count: categoryCount || 0,
        problem_count: problemCount || 0,
      };
    })
  );

  return sheetsWithCounts;
}

export async function updateDsaSheet(
  sheetId: string,
  data: { title?: string; description_md?: string }
): Promise<void> {
  const admin = createAdminClient();
  const updateData: Record<string, unknown> = { ...data, draft_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (data.title) {
    updateData.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  await admin
    .from('dsa_sheets')
    .update(updateData)
    .eq('id', sheetId);
}

// ─── Sheet Resources ────────────────────────────────────────

export async function listDsaSheetResources(sheetId: string): Promise<DsaSheetResource[]> {
  return listDsaSheetResourcesInternal(sheetId, false);
}

export async function createDsaSheetResource(
  sheetId: string,
  input: {
    title: string;
    description?: string | null;
    resource_url: string;
    resource_type?: DsaSheetResourceType;
    is_visible?: boolean;
  },
): Promise<DsaSheetResource> {
  const admin = createAdminClient();
  const normalized = normalizeDsaSheetResourceInput(input.resource_url, input.resource_type ?? 'auto');

  const { data: maxOrder } = await admin
    .from('dsa_sheet_resources')
    .select('sort_order')
    .eq('sheet_id', sheetId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from('dsa_sheet_resources')
    .insert({
      sheet_id: sheetId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      resource_url: normalized.resource_url,
      resource_type: normalized.resource_type,
      sort_order: (maxOrder?.sort_order ?? -1) + 1,
      is_visible: input.is_visible ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DsaSheetResource;
}

export async function updateDsaSheetResource(
  resourceId: string,
  input: Partial<{
    title: string;
    description: string | null;
    resource_url: string;
    resource_type: DsaSheetResourceType;
    is_visible: boolean;
  }>,
): Promise<DsaSheetResource> {
  const admin = createAdminClient();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.is_visible !== undefined) updateData.is_visible = input.is_visible;

  if (input.resource_url !== undefined || input.resource_type !== undefined) {
    const { data: existing, error: existingError } = await admin
      .from('dsa_sheet_resources')
      .select('resource_url, resource_type')
      .eq('id', resourceId)
      .single();

    if (existingError || !existing) throw existingError || new Error('Resource not found');

    const normalized = normalizeDsaSheetResourceInput(
      input.resource_url ?? existing.resource_url,
      input.resource_type ?? (existing.resource_type as DsaSheetResourceType),
    );
    updateData.resource_url = normalized.resource_url;
    updateData.resource_type = normalized.resource_type;
  }

  const { data, error } = await admin
    .from('dsa_sheet_resources')
    .update(updateData)
    .eq('id', resourceId)
    .select()
    .single();

  if (error) throw error;
  return data as DsaSheetResource;
}

export async function deleteDsaSheetResource(resourceId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('dsa_sheet_resources').delete().eq('id', resourceId);
  if (error) throw error;
}

export async function reorderDsaSheetResources(resourceIds: string[]): Promise<void> {
  const admin = createAdminClient();
  await Promise.all(
    resourceIds.map((id, index) =>
      admin.from('dsa_sheet_resources').update({ sort_order: index }).eq('id', id),
    ),
  );
}

export async function bulkImportDsaSheetResources(
  sheetId: string,
  resources: Array<{
    title: string;
    description?: string | null;
    resource_url: string;
    resource_type?: DsaSheetResourceType;
  }>,
): Promise<{ imported: number; skipped: number }> {
  if (resources.length === 0) return { imported: 0, skipped: 0 };

  const admin = createAdminClient();
  const existingResources = await listDsaSheetResourcesInternal(sheetId, false);
  const existingUrls = new Set(existingResources.map((resource) => resource.resource_url));
  const seenUrls = new Set<string>();

  let imported = 0;
  let skipped = 0;

  for (const resource of resources) {
    try {
      const normalized = normalizeDsaSheetResourceInput(resource.resource_url, resource.resource_type ?? 'auto');
      if (existingUrls.has(normalized.resource_url) || seenUrls.has(normalized.resource_url)) {
        skipped++;
        continue;
      }

      const { data: maxOrder } = await admin
        .from('dsa_sheet_resources')
        .select('sort_order')
        .eq('sheet_id', sheetId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await admin.from('dsa_sheet_resources').insert({
        sheet_id: sheetId,
        title: resource.title.trim() || 'Sheet resource',
        description: resource.description?.trim() || null,
        resource_url: normalized.resource_url,
        resource_type: normalized.resource_type,
        sort_order: (maxOrder?.sort_order ?? -1) + 1,
        is_visible: true,
      });

      if (error) {
        skipped++;
        continue;
      }

      seenUrls.add(normalized.resource_url);
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

// ─── Read LIVE data (students + college see this) ───────────

export async function getDsaSheetBySlug(slug: string): Promise<DsaSheetWithData | null> {
  const admin = createAdminClient();

  const { data: sheet, error: sheetErr } = await admin
    .from('dsa_sheets')
    .select('*')
    .eq('slug', slug)
    .single();

  if (sheetErr || !sheet) return null;

  const { data: categories, error: catErr } = await admin
    .from('dsa_categories')
    .select('*')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  const resources = await listDsaSheetResourcesInternal(sheet.id, true);

  if (catErr || !categories) return { ...sheet, categories: [], resources };

  const { data: problems } = await admin
    .from('dsa_problems')
    .select('*')
    .in('category_id', categories.map((c) => c.id))
    .order('sort_order');

  const problemsByCategory = new Map<string, DsaProblem[]>();
  for (const p of problems || []) {
    const list = problemsByCategory.get(p.category_id) || [];
    list.push(p);
    problemsByCategory.set(p.category_id, list);
  }

  const categoriesWithProblems: DsaCategoryWithProblems[] = categories.map((cat) => ({
    ...cat,
    problems: problemsByCategory.get(cat.id) || [],
  }));

  return { ...sheet, categories: categoriesWithProblems, resources };
}

export async function getDsaSheetWithData(sheetId: string): Promise<DsaSheetWithData | null> {
  const admin = createAdminClient();

  const { data: sheet, error: sheetErr } = await admin
    .from('dsa_sheets')
    .select('*')
    .eq('id', sheetId)
    .single();

  if (sheetErr || !sheet) return null;

  const { data: categories, error: catErr } = await admin
    .from('dsa_categories')
    .select('*')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  const resources = await listDsaSheetResourcesInternal(sheet.id, true);

  if (catErr || !categories) return { ...sheet, categories: [], resources };

  const { data: problems } = await admin
    .from('dsa_problems')
    .select('*')
    .in('category_id', categories.map((c) => c.id))
    .order('sort_order');

  const problemsByCategory = new Map<string, DsaProblem[]>();
  for (const p of problems || []) {
    const list = problemsByCategory.get(p.category_id) || [];
    list.push(p);
    problemsByCategory.set(p.category_id, list);
  }

  const categoriesWithProblems: DsaCategoryWithProblems[] = categories.map((cat) => ({
    ...cat,
    problems: problemsByCategory.get(cat.id) || [],
  }));

  return { ...sheet, categories: categoriesWithProblems, resources };
}

// ─── Read DRAFT data (SuperAdmin sees this) ─────────────────

const populatingSheets = new Set<string>();

async function ensureDraftPopulated(sheetId: string, admin: SupabaseClient): Promise<void> {
  if (populatingSheets.has(sheetId)) {
    while (populatingSheets.has(sheetId)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  populatingSheets.add(sheetId);
  try {
    const { data: draftCats, error: draftCatsErr } = await admin
      .from('dsa_categories_draft')
      .select('id')
      .eq('sheet_id', sheetId)
      .limit(1);

    if (draftCatsErr) return;

    if (!draftCats || draftCats.length === 0) {
      const { data: liveCats, error: liveCatsErr } = await admin
        .from('dsa_categories')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('sort_order');

      if (liveCatsErr || !liveCats || liveCats.length === 0) {
        return;
      }

      const liveToDraftCatId = new Map<string, string>();
      for (const liveCat of liveCats) {
        const { data: newDraftCat, error: insertCatErr } = await admin
          .from('dsa_categories_draft')
          .insert({
            sheet_id: sheetId,
            name: liveCat.name,
            color: liveCat.color,
            sort_order: liveCat.sort_order,
          })
          .select()
          .single();

        if (!insertCatErr && newDraftCat) {
          liveToDraftCatId.set(liveCat.id, newDraftCat.id);
        }
      }

      for (const [liveCatId, draftCatId] of liveToDraftCatId) {
        const { data: liveProblems, error: liveProbsErr } = await admin
          .from('dsa_problems')
          .select('*')
          .eq('category_id', liveCatId)
          .order('sort_order');

        if (!liveProbsErr && liveProblems && liveProblems.length > 0) {
          const draftProbs = liveProblems.map((p: { name: string; [key: string]: unknown }) => ({
            category_id: draftCatId,
            name: p.name,
            difficulty: p.difficulty,
            lc_url: p.lc_url,
            yt_url: p.yt_url,
            resource_url: p.resource_url ?? '',
            notes: p.notes,
            sort_order: p.sort_order,
          }));

          await admin.from('dsa_problems_draft').insert(draftProbs);
        }
      }
    }
  } finally {
    populatingSheets.delete(sheetId);
  }
}

export async function getDraftData(sheetId: string): Promise<DsaSheetWithData | null> {
  const admin = createAdminClient();

  await ensureDraftPopulated(sheetId, admin);

  const { data: sheet, error: sheetErr } = await admin
    .from('dsa_sheets')
    .select('*')
    .eq('id', sheetId)
    .single();

  if (sheetErr || !sheet) return null;

  const { data: categories, error: catErr } = await admin
    .from('dsa_categories_draft')
    .select('*')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  const resources = await listDsaSheetResourcesInternal(sheet.id, false);

  if (catErr || !categories) return { ...sheet, categories: [], resources };

  const { data: problems } = await admin
    .from('dsa_problems_draft')
    .select('*')
    .in('category_id', categories.map((c) => c.id))
    .order('sort_order');

  const problemsByCategory = new Map<string, DsaProblem[]>();
  for (const p of problems || []) {
    const list = problemsByCategory.get(p.category_id) || [];
    list.push(p);
    problemsByCategory.set(p.category_id, list);
  }

  const categoriesWithProblems: DsaCategoryWithProblems[] = categories.map((cat) => ({
    ...cat,
    problems: problemsByCategory.get(cat.id) || [],
  }));

  return { ...sheet, categories: categoriesWithProblems, resources };
}

// ─── Draft status ────────────────────────────────────────────

export async function getDraftStatus(sheetId: string): Promise<DsaDraftStatus> {
  const admin = createAdminClient();

  await ensureDraftPopulated(sheetId, admin);

  const { data: sheet } = await admin
    .from('dsa_sheets')
    .select('id, draft_updated_at')
    .eq('id', sheetId)
    .single();

  if (!sheet) return { hasDraft: false, draftUpdatedAt: null, categoryCount: 0, problemCount: 0 };

  const { count: categoryCount } = await admin
    .from('dsa_categories_draft')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheet.id);

  const { data: draftCatIds } = await admin
    .from('dsa_categories_draft')
    .select('id')
    .eq('sheet_id', sheet.id);

  let problemCount = 0;
  if (draftCatIds && draftCatIds.length > 0) {
    const { count } = await admin
      .from('dsa_problems_draft')
      .select('id', { count: 'exact', head: true })
      .in('category_id', draftCatIds.map(c => c.id));
    problemCount = count || 0;
  }

  return {
    hasDraft: sheet.draft_updated_at !== null,
    draftUpdatedAt: sheet.draft_updated_at,
    categoryCount: categoryCount || 0,
    problemCount,
  };
}

// ─── CRUD on DRAFT tables ───────────────────────────────────

export async function markDsaSheetDraftUpdated(sheetId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from('dsa_sheets')
    .update({ draft_updated_at: new Date().toISOString() })
    .eq('id', sheetId);
}

export async function createDsaCategory(
  sheetId: string,
  name: string,
  color: string
): Promise<DsaCategory> {
  const admin = createAdminClient();

  const { data: maxOrder } = await admin
    .from('dsa_categories_draft')
    .select('sort_order')
    .eq('sheet_id', sheetId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { data, error } = await admin
    .from('dsa_categories_draft')
    .insert({ sheet_id: sheetId, name, color, sort_order: nextOrder })
    .select()
    .single();

  if (error) throw error;
  await markDsaSheetDraftUpdated(sheetId);
  return data;
}

export async function updateDsaCategory(
  categoryId: string,
  data: { name?: string; color?: string; sort_order?: number }
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('dsa_categories_draft').update(data).eq('id', categoryId);
}

export async function deleteDsaCategory(categoryId: string): Promise<void> {
  const admin = createAdminClient();
  // First delete all problems associated with the category to satisfy foreign key constraints
  await admin.from('dsa_problems_draft').delete().eq('category_id', categoryId);
  // Then delete the category itself
  const { error } = await admin.from('dsa_categories_draft').delete().eq('id', categoryId);
  if (error) throw error;
}

export async function reorderDsaCategories(categoryIds: string[]): Promise<void> {
  const admin = createAdminClient();
  const updates = categoryIds.map((id, index) =>
    admin.from('dsa_categories_draft').update({ sort_order: index }).eq('id', id)
  );
  await Promise.all(updates);
}

export async function createDsaProblem(
  categoryId: string,
  data: {
    name: string;
    difficulty: string;
    lc_url: string;
    yt_url: string;
    resource_url?: string;
    notes: string;
  }
): Promise<DsaProblem> {
  const admin = createAdminClient();

  const { data: maxOrder } = await admin
    .from('dsa_problems_draft')
    .select('sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { data: problem, error } = await admin
    .from('dsa_problems_draft')
    .insert({ category_id: categoryId, ...data, sort_order: nextOrder })
    .select()
    .single();

  if (error) throw error;
  return problem;
}

export async function updateDsaProblem(
  problemId: string,
  data: Partial<{
    name: string;
    difficulty: string;
    lc_url: string;
    yt_url: string;
    resource_url: string;
    notes: string;
    sort_order: number;
  }>
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('dsa_problems_draft').update(data).eq('id', problemId);
}

export async function deleteDsaProblem(problemId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from('dsa_problems_draft').delete().eq('id', problemId);
}

export async function reorderDsaProblems(
  categoryId: string,
  problemIds: string[]
): Promise<void> {
  const admin = createAdminClient();
  const updates = problemIds.map((id, index) =>
    admin.from('dsa_problems_draft').update({ sort_order: index }).eq('id', id)
  );
  await Promise.all(updates);
}

export async function bulkImportProblems(
  sheetId: string,
  problems: Array<{
    category: string;
    name: string;
    difficulty: string;
    lc_url: string;
    yt_url: string;
    resource_url?: string;
    notes: string;
  }>
): Promise<{ imported: number; duplicates: number; categoriesCreated: number }> {
  const admin = createAdminClient();

  const { data: sheet } = await admin
    .from('dsa_sheets')
    .select('id')
    .eq('id', sheetId)
    .single();

  if (!sheet) throw new Error('No DSA sheet found');

  const categoryMap = new Map<string, string>();
  const { data: existingCats } = await admin
    .from('dsa_categories_draft')
    .select('id, name')
    .eq('sheet_id', sheet.id);

  for (const cat of existingCats || []) {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  }

  let categoriesCreated = 0;
  let imported = 0;
  let duplicates = 0;

  const grouped = new Map<string, typeof problems>();
  for (const p of problems) {
    const key = p.category.toLowerCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  for (const [catName, catProblems] of grouped) {
    let categoryId = categoryMap.get(catName);

    if (!categoryId) {
      const { data: newCat } = await admin
        .from('dsa_categories_draft')
        .insert({
          sheet_id: sheet.id,
          name: catProblems[0].category,
          color: 'primary',
          sort_order: categoryMap.size + categoriesCreated,
        })
        .select()
        .single();

      if (newCat) {
        categoryId = newCat.id;
        categoryMap.set(catName, newCat.id);
        categoriesCreated++;
      }
    }

    if (!categoryId) continue;

    const { data: existingProblems } = await admin
      .from('dsa_problems_draft')
      .select('name')
      .eq('category_id', categoryId);

    const existingNames = new Set(
      (existingProblems || []).map((p) => p.name.toLowerCase())
    );

    const { data: maxOrder } = await admin
      .from('dsa_problems_draft')
      .select('sort_order')
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxOrder?.sort_order ?? -1) + 1;

    const toInsert = [];
    for (const p of catProblems) {
      if (existingNames.has(p.name.toLowerCase())) {
        duplicates++;
        continue;
      }
      toInsert.push({
        category_id: categoryId,
        name: p.name,
        difficulty: p.difficulty,
        lc_url: p.lc_url,
        yt_url: p.yt_url,
        resource_url: p.resource_url ?? '',
        notes: p.notes,
        sort_order: nextOrder++,
      });
      existingNames.add(p.name.toLowerCase());
    }

    if (toInsert.length > 0) {
      await admin.from('dsa_problems_draft').insert(toInsert);
      imported += toInsert.length;
    }
  }

  if (imported > 0 || categoriesCreated > 0) {
    await markDsaSheetDraftUpdated(sheet.id);
  }

  return { imported, duplicates, categoriesCreated };
}

// ─── Publish: draft → live ──────────────────────────────────

export async function publishDraft(sheetId: string): Promise<{ categoriesPublished: number; problemsPublished: number }> {
  const admin = createAdminClient();

  const { data: sheet, error: sheetErr } = await admin
    .from('dsa_sheets')
    .select('id')
    .eq('id', sheetId)
    .single();

  if (sheetErr || !sheet) {
    throw sheetErr || new Error('No DSA sheet found');
  }

  const { data: draftCategories, error: draftCatsErr } = await admin
    .from('dsa_categories_draft')
    .select('*')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  if (draftCatsErr) throw draftCatsErr;

  const { data: liveCats, error: liveCatsErr } = await admin
    .from('dsa_categories')
    .select('id')
    .eq('sheet_id', sheet.id);

  if (liveCatsErr) throw liveCatsErr;

  if (liveCats && liveCats.length > 0) {
    const { error: deleteCatsErr } = await admin.from('dsa_categories').delete().eq('sheet_id', sheet.id);
    if (deleteCatsErr) throw deleteCatsErr;
  }

  const draftToLiveCatId = new Map<string, string>();
  let categoriesPublished = 0;

  for (const draftCat of draftCategories || []) {
    const { data: newLiveCat, error: insertCatErr } = await admin
      .from('dsa_categories')
      .insert({
        sheet_id: sheet.id,
        name: draftCat.name,
        color: draftCat.color,
        sort_order: draftCat.sort_order,
      })
      .select()
      .single();

    if (insertCatErr) throw insertCatErr;

    if (newLiveCat) {
      draftToLiveCatId.set(draftCat.id, newLiveCat.id);
      categoriesPublished++;
    }
  }

  let problemsPublished = 0;

  for (const [draftCatId, liveCatId] of draftToLiveCatId) {
    const { data: draftProblems, error: draftProbsErr } = await admin
      .from('dsa_problems_draft')
      .select('*')
      .eq('category_id', draftCatId)
      .order('sort_order');

    if (draftProbsErr) throw draftProbsErr;

    if (draftProblems && draftProblems.length > 0) {
      const toInsert = draftProblems.map((p) => ({
        category_id: liveCatId,
        name: p.name,
        difficulty: p.difficulty,
        lc_url: p.lc_url,
        yt_url: p.yt_url,
        resource_url: p.resource_url ?? '',
        notes: p.notes,
        sort_order: p.sort_order,
      }));

      const { error: insertProbsErr } = await admin.from('dsa_problems').insert(toInsert);
      if (insertProbsErr) {
        if (!isMissingColumnError(insertProbsErr, 'resource_url')) throw insertProbsErr;

        const fallbackInsert = toInsert.map(({ resource_url: _resourceUrl, ...problem }) => problem);
        const { error: fallbackErr } = await admin.from('dsa_problems').insert(fallbackInsert);
        if (fallbackErr) throw fallbackErr;
      }
      problemsPublished += toInsert.length;
    }
  }

  if (draftCategories && draftCategories.length > 0) {
    const { error: deleteDraftProbsErr } = await admin.from('dsa_problems_draft').delete().in(
      'category_id',
      draftCategories.map((c) => c.id)
    );
    if (deleteDraftProbsErr) throw deleteDraftProbsErr;
  }
  
  const { error: deleteDraftCatsErr } = await admin.from('dsa_categories_draft').delete().eq('sheet_id', sheet.id);
  if (deleteDraftCatsErr) throw deleteDraftCatsErr;

  const { error: updateSheetErr } = await admin
    .from('dsa_sheets')
    .update({ draft_updated_at: null, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', sheet.id);

  if (updateSheetErr) throw updateSheetErr;

  return { categoriesPublished, problemsPublished };
}

// ─── Analytics (reads from LIVE tables) ─────────────────────

export async function getDsaAnalytics(sheetId: string): Promise<DsaAnalytics> {
  const admin = createAdminClient();

  const { data: sheet } = await admin
    .from('dsa_sheets')
    .select('id')
    .eq('id', sheetId)
    .single();

  if (!sheet) {
    return {
      totalStudents: 0,
      totalProblems: 0,
      overallCompletionPct: 0,
      avgProblemsPerStudent: 0,
      categoryBreakdown: [],
      studentLeaderboard: [],
      problemStats: [],
    };
  }

  // Get enrolled students for this sheet
  const { data: enrollments } = await admin
    .from('dsa_enrollments')
    .select('student_id')
    .eq('sheet_id', sheetId);

  const enrolledStudentIds = (enrollments || []).map((e) => e.student_id);
  const totalStudents = enrolledStudentIds.length;

  const { data: categories } = await admin
    .from('dsa_categories')
    .select('id, name')
    .eq('sheet_id', sheet.id);

  const categoryIds = (categories || []).map((c) => c.id);
  const catNameMap = new Map((categories || []).map((c) => [c.id, c.name]));

  const { data: problems } = await admin
    .from('dsa_problems')
    .select('id, name, category_id, difficulty')
    .in('category_id', categoryIds);

  const totalProblems = (problems || []).length;

  if (totalStudents === 0 || totalProblems === 0) {
    return {
      totalStudents,
      totalProblems,
      overallCompletionPct: 0,
      avgProblemsPerStudent: 0,
      categoryBreakdown: (categories || []).map(cat => ({
        category: cat.name,
        problemCount: (problems || []).filter((p) => p.category_id === cat.id).length,
        avgCompletion: 0,
        easy: (problems || []).filter((p) => p.category_id === cat.id && p.difficulty === 'Easy').length,
        medium: (problems || []).filter((p) => p.category_id === cat.id && p.difficulty === 'Medium').length,
        hard: (problems || []).filter((p) => p.category_id === cat.id && p.difficulty === 'Hard').length,
      })),
      studentLeaderboard: [],
      problemStats: (problems || []).map(p => ({
        problemId: p.id,
        name: p.name,
        category: catNameMap.get(p.category_id) || '',
        solvedCount: 0,
        favoritedCount: 0,
      })),
    };
  }

  const { data: allProgress } = await admin
    .from('dsa_progress')
    .select('student_id, problem_id')
    .in('student_id', enrolledStudentIds);

  const { data: allFavorites } = await admin
    .from('dsa_favorites')
    .select('student_id, problem_id')
    .in('student_id', enrolledStudentIds);

  const progressByStudent = new Map<string, Set<string>>();
  for (const p of allProgress || []) {
    if (!progressByStudent.has(p.student_id)) {
      progressByStudent.set(p.student_id, new Set());
    }
    progressByStudent.get(p.student_id)!.add(p.problem_id);
  }

  const totalCompleted = (allProgress || []).length;
  const overallCompletionPct =
    totalProblems > 0 && totalStudents > 0
      ? Math.round((totalCompleted / (totalProblems * totalStudents)) * 100)
      : 0;

  const avgProblemsPerStudent =
    totalStudents > 0
      ? Math.round(totalCompleted / totalStudents)
      : 0;

  const problemMap = new Map((problems || []).map((p) => [p.id, p]));

  const categoryBreakdown = (categories || []).map((cat) => {
    const catProblems = (problems || []).filter((p) => p.category_id === cat.id);
    const easy = catProblems.filter((p) => p.difficulty === 'Easy').length;
    const medium = catProblems.filter((p) => p.difficulty === 'Medium').length;
    const hard = catProblems.filter((p) => p.difficulty === 'Hard').length;

    let completedInCategory = 0;
    for (const [, solved] of progressByStudent) {
      for (const p of catProblems) {
        if (solved.has(p.id)) completedInCategory++;
      }
    }
    const avgCompletion =
      catProblems.length > 0 && totalStudents > 0
        ? Math.round((completedInCategory / (catProblems.length * totalStudents)) * 100)
        : 0;

    return {
      category: cat.name,
      problemCount: catProblems.length,
      avgCompletion,
      easy,
      medium,
      hard,
    };
  });

  const studentLeaderboard = await Promise.all(
    enrolledStudentIds.map(async (studentId) => {
      const solved = progressByStudent.get(studentId) || new Set<string>();
      let easy = 0, medium = 0, hard = 0;
      for (const problemId of solved) {
        const prob = problemMap.get(problemId);
        if (prob) {
          if (prob.difficulty === 'Easy') easy++;
          else if (prob.difficulty === 'Medium') medium++;
          else hard++;
        }
      }

      const { data: student } = await admin
        .from('students')
        .select('full_name, college_id')
        .eq('id', studentId)
        .single();

      const { data: college } = student?.college_id
        ? await admin.from('colleges').select('name').eq('id', student.college_id).single()
        : { data: null };

      return {
        studentId,
        name: student?.full_name || 'Unknown',
        college: college?.name || 'N/A',
        easy, medium, hard,
        total: easy + medium + hard,
        pct: totalProblems > 0 ? Math.round(((easy + medium + hard) / totalProblems) * 100) : 0,
        lastActive: new Date().toISOString(),
      };
    })
  );

  studentLeaderboard.sort((a, b) => b.total - a.total);

  const problemStats = (problems || []).map((prob) => {
    let solvedCount = 0;
    for (const [, solved] of progressByStudent) {
      if (solved.has(prob.id)) solvedCount++;
    }
    const favCount = (allFavorites || []).filter((f) => f.problem_id === prob.id).length;
    return {
      problemId: prob.id,
      name: prob.name,
      category: catNameMap.get(prob.category_id) || '',
      solvedCount,
      favoritedCount: favCount,
    };
  });

  return {
    totalStudents,
    totalProblems,
    overallCompletionPct,
    avgProblemsPerStudent,
    categoryBreakdown,
    studentLeaderboard,
    problemStats,
  };
}

export async function deleteDsaSheet(sheetId: string): Promise<void> {
  const admin = createAdminClient();

  // Delete enrollments
  await admin.from('dsa_enrollments').delete().eq('sheet_id', sheetId);

  // Get live categories
  const { data: liveCats } = await admin
    .from('dsa_categories')
    .select('id')
    .eq('sheet_id', sheetId);

  if (liveCats && liveCats.length > 0) {
    const liveCatIds = liveCats.map((c) => c.id);

    // Get live problems to clear progress/favorites
    const { data: liveProblems } = await admin
      .from('dsa_problems')
      .select('id')
      .in('category_id', liveCatIds);

    if (liveProblems && liveProblems.length > 0) {
      const problemIds = liveProblems.map((p) => p.id);
      await admin.from('dsa_progress').delete().in('problem_id', problemIds);
      await admin.from('dsa_favorites').delete().in('problem_id', problemIds);
      await admin.from('dsa_problems').delete().in('id', problemIds);
    }
    // Delete live categories
    await admin.from('dsa_categories').delete().eq('sheet_id', sheetId);
  }

  // Get draft categories
  const { data: draftCats } = await admin
    .from('dsa_categories_draft')
    .select('id')
    .eq('sheet_id', sheetId);

  if (draftCats && draftCats.length > 0) {
    const draftCatIds = draftCats.map((c) => c.id);

    // Get draft problems to clear
    const { data: draftProblems } = await admin
      .from('dsa_problems_draft')
      .select('id')
      .in('category_id', draftCatIds);

    if (draftProblems && draftProblems.length > 0) {
      const draftProblemIds = draftProblems.map((p) => p.id);
      await admin.from('dsa_problems_draft').delete().in('id', draftProblemIds);
    }
    // Delete draft categories
    await admin.from('dsa_categories_draft').delete().eq('sheet_id', sheetId);
  }

  // Finally delete the sheet
  const { error } = await admin.from('dsa_sheets').delete().eq('id', sheetId);
  if (error) throw error;
}

export async function toggleDsaSheetActive(sheetId: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('dsa_sheets')
    .update({ is_active: active })
    .eq('id', sheetId);
  if (error) throw error;
}
