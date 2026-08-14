import 'server-only';
import { cacheTag, cacheLife, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DsaSheetWithData, DsaCategoryWithProblems, DsaProblem, DsaSheetResource } from '@/types/dsa';

async function listVisibleDsaSheetResources(sheetId: string): Promise<DsaSheetResource[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dsa_sheet_resources')
    .select('id, sheet_id, title, description, resource_url, resource_type, sort_order, is_visible, created_at, updated_at')
    .eq('sheet_id', sheetId)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) return [];
  return (data ?? []) as DsaSheetResource[];
}

async function getCachedActiveDsaSheets() {
  'use cache';
  cacheLife('minutes');
  cacheTag('sheets');
  const admin = createAdminClient();
  const { data: sheets, error } = await admin
    .from('dsa_sheets')
    .select('id, title, slug, description_md, is_active, draft_updated_at, published_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !sheets) return [];

  const publishedSheets = sheets.filter((s) => Boolean(s.published_at) && !s.draft_updated_at);
  const sheetIds = publishedSheets.map((s) => s.id);
  const { data: categories } = sheetIds.length > 0
    ? await admin
      .from('dsa_categories')
      .select('id, sheet_id')
      .in('sheet_id', sheetIds)
    : { data: [] };

  const categoriesCountMap = new Map<string, number>();
  const categoryToSheetMap = new Map<string, string>();
  for (const c of categories || []) {
    categoriesCountMap.set(c.sheet_id, (categoriesCountMap.get(c.sheet_id) || 0) + 1);
    categoryToSheetMap.set(c.id, c.sheet_id);
  }

  const categoryIds = (categories || []).map((c) => c.id);
  const problemsCountMap = new Map<string, number>();
  const sheetProblemIdsMap = new Map<string, string[]>();

  if (categoryIds.length > 0) {
    const { data: problems } = await admin
      .from('dsa_problems')
      .select('id, category_id')
      .in('category_id', categoryIds);

    for (const p of problems || []) {
      const sheetId = categoryToSheetMap.get(p.category_id);
      if (sheetId) {
        problemsCountMap.set(sheetId, (problemsCountMap.get(sheetId) || 0) + 1);
        const list = sheetProblemIdsMap.get(sheetId) || [];
        list.push(p.id);
        sheetProblemIdsMap.set(sheetId, list);
      }
    }
  }

  return sheets.map((s) => {
    const isPublished = Boolean(s.published_at) && !s.draft_updated_at;
    return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    description_md: s.description_md || '',
    is_active: s.is_active,
    draft_updated_at: s.draft_updated_at,
    published_at: s.published_at,
    isPublished,
    categoriesCount: isPublished ? categoriesCountMap.get(s.id) || 0 : 0,
    problemsCount: isPublished ? problemsCountMap.get(s.id) || 0 : 0,
    problemIds: isPublished ? sheetProblemIdsMap.get(s.id) || [] : [],
  };
  });
}

async function getCachedStudentEnrollments(studentId: string): Promise<string[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(`dsa-enrollments-${studentId}`);

  const admin = createAdminClient();
  const { data } = await admin
    .from('dsa_enrollments')
    .select('sheet_id')
    .eq('student_id', studentId);
  
  return (data || []).map((e) => e.sheet_id);
}

async function getCachedStudentDsaProgress(studentId: string): Promise<{
  completedProblemIds: string[];
  favoritedProblemIds: string[];
}> {
  'use cache';
  cacheLife('hours');
  cacheTag(`dsa-progress-${studentId}`);

  const admin = createAdminClient();
  const [progressRes, favsRes] = await Promise.all([
    admin.from('dsa_progress').select('problem_id').eq('student_id', studentId),
    admin.from('dsa_favorites').select('problem_id').eq('student_id', studentId),
  ]);

  return {
    completedProblemIds: (progressRes.data || []).map((p) => p.problem_id),
    favoritedProblemIds: (favsRes.data || []).map((f) => f.problem_id),
  };
}

export async function listDsaSheetsWithEnrollment(
  studentId: string
): Promise<Array<{
  id: string;
  title: string;
  slug: string;
  description_md: string;
  is_active: boolean;
  draft_updated_at: string | null;
  published_at: string | null;
  isPublished: boolean;
  isEnrolled: boolean;
  categoriesCount: number;
  problemsCount: number;
  completedCount: number;
}>> {
  const staticSheets = await getCachedActiveDsaSheets();
  if (staticSheets.length === 0) return [];

  const [enrolledSheetIdsRaw, progressRaw] = await Promise.all([
    getCachedStudentEnrollments(studentId),
    getCachedStudentDsaProgress(studentId),
  ]);

  const enrolledSheetIds = new Set(enrolledSheetIdsRaw);
  const completedProblemIds = new Set(progressRaw.completedProblemIds);

  return staticSheets.map((sheet) => {
    let completedCount = 0;
    for (const pId of sheet.problemIds) {
      if (completedProblemIds.has(pId)) {
        completedCount++;
      }
    }

    return {
      id: sheet.id,
      title: sheet.title,
      slug: sheet.slug,
      description_md: sheet.description_md,
      is_active: sheet.is_active,
      draft_updated_at: sheet.draft_updated_at,
      published_at: sheet.published_at,
      isPublished: sheet.isPublished,
      isEnrolled: enrolledSheetIds.has(sheet.id),
      categoriesCount: sheet.categoriesCount,
      problemsCount: sheet.problemsCount,
      completedCount,
    };
  });
}

export async function enrollInDsaSheet(studentId: string, sheetId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: sheet, error: sheetError } = await admin
    .from('dsa_sheets')
    .select('published_at, draft_updated_at, is_active')
    .eq('id', sheetId)
    .single();

  if (sheetError || !sheet?.is_active || !sheet.published_at || sheet.draft_updated_at) {
    throw new Error('This sheet is coming soon. It will open after it is published.');
  }

  const { error } = await admin.from('dsa_enrollments').upsert(
    { student_id: studentId, sheet_id: sheetId },
    { onConflict: 'student_id,sheet_id' }
  );
  if (error) throw new Error(`Enrollment failed: ${error.message}`);
  revalidateTag(`dsa-enrollments-${studentId}`, 'max');
}

export async function unenrollFromDsaSheet(studentId: string, sheetId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('dsa_enrollments').delete().eq('student_id', studentId).eq('sheet_id', sheetId);
  if (error) throw new Error(`Unenroll failed: ${error.message}`);
  revalidateTag(`dsa-enrollments-${studentId}`, 'max');
}

async function getCachedDsaSheetByIdInner(sheetId: string): Promise<DsaSheetWithData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('sheets');
  const admin = createAdminClient();

  const { data: sheet, error: sheetErr } = await admin
    .from('dsa_sheets')
    .select('id, title, slug, description_md, is_active, draft_updated_at, published_at, created_at, updated_at')
    .eq('id', sheetId)
    .single();

  if (sheetErr || !sheet) return null;
  if (!sheet.published_at || sheet.draft_updated_at) return null;

  const { data: categories, error: catErr } = await admin
    .from('dsa_categories')
    .select('id, sheet_id, name, color, sort_order, created_at')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  const resources = await listVisibleDsaSheetResources(sheet.id);

  if (catErr || !categories) return { ...sheet, categories: [], resources };

  const { data: problems } = await admin
    .from('dsa_problems')
    .select('id, category_id, name, difficulty, lc_url, yt_url, resource_url, notes, sort_order, created_at')
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

export async function getDsaSheetById(sheetId: string): Promise<DsaSheetWithData | null> {
  return getCachedDsaSheetByIdInner(sheetId);
}

async function getCachedDsaSheetBySlugInner(slug: string): Promise<DsaSheetWithData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('sheets');
  const admin = createAdminClient();

  const { data: sheet, error: sheetErr } = await admin
    .from('dsa_sheets')
    .select('id, title, slug, description_md, is_active, draft_updated_at, published_at, created_at, updated_at')
    .eq('slug', slug)
    .single();

  if (sheetErr || !sheet) return null;
  if (!sheet.published_at || sheet.draft_updated_at) return null;

  const { data: categories, error: catErr } = await admin
    .from('dsa_categories')
    .select('id, sheet_id, name, color, sort_order, created_at')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  const resources = await listVisibleDsaSheetResources(sheet.id);

  if (catErr || !categories) return { ...sheet, categories: [], resources };

  const { data: problems } = await admin
    .from('dsa_problems')
    .select('id, category_id, name, difficulty, lc_url, yt_url, resource_url, notes, sort_order, created_at')
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

export async function getDsaSheetBySlug(slug: string): Promise<DsaSheetWithData | null> {
  return getCachedDsaSheetBySlugInner(slug);
}

export async function getStudentDsaProgress(
  studentId: string
): Promise<{
  completedProblemIds: Set<string>;
  favoritedProblemIds: Set<string>;
}> {
  const progressRaw = await getCachedStudentDsaProgress(studentId);

  return {
    completedProblemIds: new Set(progressRaw.completedProblemIds),
    favoritedProblemIds: new Set(progressRaw.favoritedProblemIds),
  };
}

export async function toggleDsaProgress(
  studentId: string,
  problemId: string,
  done: boolean
): Promise<void> {
  const admin = createAdminClient();

  if (done) {
    const { error } = await admin.from('dsa_progress').upsert(
      { student_id: studentId, problem_id: problemId },
      { onConflict: 'student_id,problem_id' }
    );
    if (error) throw new Error(`Failed to update progress: ${error.message}`);
  } else {
    const { error } = await admin
      .from('dsa_progress')
      .delete()
      .eq('student_id', studentId)
      .eq('problem_id', problemId);
    if (error) throw new Error(`Failed to update progress: ${error.message}`);
  }
  revalidateTag(`dsa-progress-${studentId}`, 'max');
}

export async function toggleDsaFavorite(
  studentId: string,
  problemId: string,
  favorited: boolean
): Promise<void> {
  const admin = createAdminClient();

  if (favorited) {
    const { error } = await admin.from('dsa_favorites').upsert(
      { student_id: studentId, problem_id: problemId },
      { onConflict: 'student_id,problem_id' }
    );
    if (error) throw new Error(`Failed to update favorite: ${error.message}`);
  } else {
    const { error } = await admin
      .from('dsa_favorites')
      .delete()
      .eq('student_id', studentId)
      .eq('problem_id', problemId);
    if (error) throw new Error(`Failed to update favorite: ${error.message}`);
  }
  revalidateTag(`dsa-progress-${studentId}`, 'max');
}

export async function isStudentEnrolled(studentId: string, sheetId: string): Promise<boolean> {
  const enrolledSheetIds = await getCachedStudentEnrollments(studentId);
  return enrolledSheetIds.includes(sheetId);
}

export async function getVisibleDsaSheetResourceById(resourceId: string): Promise<{
  resource: DsaSheetResource;
  sheet: { id: string; is_active: boolean };
} | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dsa_sheet_resources')
    .select(`
      id,
      sheet_id,
      title,
      description,
      resource_url,
      resource_type,
      sort_order,
      is_visible,
      created_at,
      updated_at,
      dsa_sheets!inner(id, is_active, draft_updated_at, published_at)
    `)
    .eq('id', resourceId)
    .eq('is_visible', true)
    .single();

  if (error || !data) return null;

  const sheet = data.dsa_sheets as unknown as { id: string; is_active: boolean; draft_updated_at: string | null; published_at: string | null };
  if (!sheet?.is_active || !sheet.published_at || sheet.draft_updated_at) return null;

  const { dsa_sheets: _sheet, ...resource } = data as typeof data & { dsa_sheets?: unknown };
  void _sheet;

  return {
    resource: resource as DsaSheetResource,
    sheet,
  };
}

export async function getVisibleDsaProblemResourceById(problemId: string): Promise<{
  problem: DsaProblem;
  sheet: { id: string; slug: string; is_active: boolean };
} | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dsa_problems')
    .select(`
      id,
      category_id,
      name,
      difficulty,
      lc_url,
      yt_url,
      resource_url,
      notes,
      sort_order,
      created_at,
      dsa_categories!inner(
        sheet_id,
        dsa_sheets!inner(id, slug, is_active, draft_updated_at, published_at)
      )
    `)
    .eq('id', problemId)
    .single();

  if (error || !data || !data.resource_url) return null;

  const category = data.dsa_categories as unknown as {
    sheet_id: string;
    dsa_sheets: { id: string; slug: string; is_active: boolean; draft_updated_at: string | null; published_at: string | null };
  };
  const sheet = category?.dsa_sheets;
  if (!sheet?.is_active || !sheet.published_at || sheet.draft_updated_at) return null;

  const { dsa_categories: _category, ...problem } = data as typeof data & { dsa_categories?: unknown };
  void _category;

  return {
    problem: problem as DsaProblem,
    sheet: { id: sheet.id, slug: sheet.slug, is_active: sheet.is_active },
  };
}

async function getCachedDsaReadmeMarkdown(): Promise<string> {
  'use cache';
  cacheLife('hours');
  cacheTag('sheets');
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('platform_settings')
    .select('dsa_readme_markdown')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    const missing =
      error.code === '42P01' ||
      error.code === 'PGRST204' ||
      (error.message ?? '').toLowerCase().includes('schema cache');
    if (missing) return '';
    throw new Error(error.message);
  }
  return data?.dsa_readme_markdown || '';
}

export async function getDsaReadmeMarkdown(): Promise<string> {
  return getCachedDsaReadmeMarkdown();
}


