'use server';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import {
  getDraftData,
  getDsaAnalytics,
  getDraftStatus,
  publishDraft,
  createDsaSheet,
  updateDsaSheet,
  createDsaCategory,
  updateDsaCategory,
  deleteDsaCategory,
  reorderDsaCategories,
  createDsaProblem,
  updateDsaProblem,
  deleteDsaProblem,
  reorderDsaProblems,
  bulkImportProblems,
  listDsaSheets,
  deleteDsaSheet,
  toggleDsaSheetActive,
  createDsaSheetResource,
  updateDsaSheetResource,
  deleteDsaSheetResource,
  reorderDsaSheetResources,
  bulkImportDsaSheetResources,
  markDsaSheetDraftUpdated,
} from '@/lib/services/dsa-sheet';
import type { DsaSheetResourceType } from '@/types/dsa';
import { revalidatePath } from 'next/cache';

async function requireAuth() {
  const auth = await getSessionFromHeaders();
  if (!auth) throw new Error('Unauthorized');
  return auth;
}

export async function fetchSheetsList() {
  await requireAuth();
  return listDsaSheets();
}

export async function fetchSheetData(sheetId: string) {
  await requireAuth();
  return getDraftData(sheetId);
}

export async function fetchAnalytics(sheetId: string) {
  await requireAuth();
  return getDsaAnalytics(sheetId);
}

export async function fetchDraftStatus(sheetId: string) {
  await requireAuth();
  return getDraftStatus(sheetId);
}

export async function publishSheet(sheetId: string) {
  await requireAuth();
  try {
    const result = await publishDraft(sheetId);
    revalidatePath('/sheets');
    revalidatePath(`/sheets/${sheetId}`);
    return result;
  } catch (error) {
    throw new Error(formatPublishError(error));
  }
}

function formatPublishError(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const maybeError = error as { code?: string; message?: string };
    if (maybeError.code === 'PGRST204' && maybeError.message?.includes("'resource_url' column")) {
      return 'Unable to publish: the database is missing the DSA problem Resource URL column. Apply migration 00311_dsa_problem_resource_url.sql and refresh the Supabase schema cache.';
    }
    if (maybeError.code === 'PGRST204' && maybeError.message?.includes("'published_at' column")) {
      return 'Unable to publish: the database is missing the DSA sheet publish gate column. Apply migration 00312_dsa_sheet_publish_gate.sql and refresh the Supabase schema cache.';
    }
    if (maybeError.message) return maybeError.message;
  }

  return 'Unable to publish this sheet. Check the server logs for details.';
}

export async function createSheet(title: string) {
  await requireAuth();
  const sheet = await createDsaSheet(title);
  revalidatePath('/sheets');
  return sheet;
}

export async function updateSheetIntro(sheetId: string, description_md: string) {
  await requireAuth();
  await updateDsaSheet(sheetId, { description_md });
  revalidatePath('/sheets');
  revalidatePath(`/sheets/${sheetId}`);
}

export async function updateSheetTitle(sheetId: string, title: string) {
  await requireAuth();
  await updateDsaSheet(sheetId, { title });
  revalidatePath('/sheets');
  revalidatePath(`/sheets/${sheetId}`);
}

export async function addSheetResource(
  sheetId: string,
  data: {
    title: string;
    description?: string | null;
    resource_url: string;
    resource_type?: DsaSheetResourceType;
    is_visible?: boolean;
  },
) {
  await requireAuth();
  const resource = await createDsaSheetResource(sheetId, data);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath('/sheets');
  revalidatePath(`/sheets/${sheetId}`);
  return resource;
}

export async function editSheetResource(
  sheetId: string,
  resourceId: string,
  data: Partial<{
    title: string;
    description: string | null;
    resource_url: string;
    resource_type: DsaSheetResourceType;
    is_visible: boolean;
  }>,
) {
  await requireAuth();
  const resource = await updateDsaSheetResource(resourceId, data);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath('/sheets');
  revalidatePath(`/sheets/${sheetId}`);
  return resource;
}

export async function removeSheetResource(sheetId: string, resourceId: string) {
  await requireAuth();
  await deleteDsaSheetResource(resourceId);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath('/sheets');
  revalidatePath(`/sheets/${sheetId}`);
}

export async function moveSheetResource(
  sheetId: string,
  resourceId: string,
  direction: 'up' | 'down',
  allIds: string[],
) {
  await requireAuth();
  const idx = allIds.indexOf(resourceId);
  if (direction === 'up' && idx <= 0) return;
  if (direction === 'down' && (idx < 0 || idx >= allIds.length - 1)) return;

  const newOrder = [...allIds];
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  [newOrder[idx], newOrder[swapWith]] = [newOrder[swapWith], newOrder[idx]];
  await reorderDsaSheetResources(newOrder);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath('/sheets');
  revalidatePath(`/sheets/${sheetId}`);
}

export async function addCategory(sheetId: string, name: string, color: string) {
  await requireAuth();
  const cat = await createDsaCategory(sheetId, name, color);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
  return cat;
}

export async function editCategory(sheetId: string, categoryId: string, data: { name?: string; color?: string }) {
  await requireAuth();
  await updateDsaCategory(categoryId, data);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function removeCategory(sheetId: string, categoryId: string) {
  await requireAuth();
  await deleteDsaCategory(categoryId);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function moveCategoryUp(sheetId: string, categoryId: string, allIds: string[]) {
  await requireAuth();
  const idx = allIds.indexOf(categoryId);
  if (idx <= 0) return;
  const newOrder = [...allIds];
  [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
  await reorderDsaCategories(newOrder);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function moveCategoryDown(sheetId: string, categoryId: string, allIds: string[]) {
  await requireAuth();
  const idx = allIds.indexOf(categoryId);
  if (idx < 0 || idx >= allIds.length - 1) return;
  const newOrder = [...allIds];
  [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
  await reorderDsaCategories(newOrder);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function addProblem(
  sheetId: string,
  categoryId: string,
  data: {
    name: string;
    difficulty: string;
    lc_url: string;
    yt_url: string;
    resource_url?: string;
    notes: string;
  }
) {
  await requireAuth();
  const problem = await createDsaProblem(categoryId, data);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
  return problem;
}

export async function editProblem(
  sheetId: string,
  problemId: string,
  data: Partial<{
    name: string;
    difficulty: string;
    lc_url: string;
    yt_url: string;
    resource_url: string;
    notes: string;
  }>
) {
  await requireAuth();
  await updateDsaProblem(problemId, data);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function removeProblem(sheetId: string, problemId: string) {
  await requireAuth();
  await deleteDsaProblem(problemId);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function moveProblemUp(
  sheetId: string,
  problemId: string,
  categoryId: string,
  allIds: string[]
) {
  await requireAuth();
  const idx = allIds.indexOf(problemId);
  if (idx <= 0) return;
  const newOrder = [...allIds];
  [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
  await reorderDsaProblems(categoryId, newOrder);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function moveProblemDown(
  sheetId: string,
  problemId: string,
  categoryId: string,
  allIds: string[]
) {
  await requireAuth();
  const idx = allIds.indexOf(problemId);
  if (idx < 0 || idx >= allIds.length - 1) return;
  const newOrder = [...allIds];
  [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
  await reorderDsaProblems(categoryId, newOrder);
  await markDsaSheetDraftUpdated(sheetId);
  revalidatePath(`/sheets/${sheetId}`);
}

export async function importFromSpreadsheet(
  sheetId: string,
  problems: Array<{
    category: string;
    name: string;
    difficulty: string;
    lc_url: string;
    yt_url: string;
    resource_url?: string;
    notes: string;
  }>,
  resources: Array<{
    title: string;
    description?: string | null;
    resource_url: string;
    resource_type?: DsaSheetResourceType;
  }> = [],
) {
  await requireAuth();
  const [result, resourceResult] = await Promise.all([
    bulkImportProblems(sheetId, problems),
    bulkImportDsaSheetResources(sheetId, resources),
  ]);
  if (result.imported > 0 || result.categoriesCreated > 0 || resourceResult.imported > 0) {
    await markDsaSheetDraftUpdated(sheetId);
  }
  revalidatePath(`/sheets/${sheetId}`);
  return {
    ...result,
    resourcesImported: resourceResult.imported,
    resourcesSkipped: resourceResult.skipped,
  };
}

export async function deleteSheet(sheetId: string) {
  await requireAuth();
  await deleteDsaSheet(sheetId);
  revalidatePath('/sheets');
}

export async function toggleSheetActive(sheetId: string, active: boolean) {
  await requireAuth();
  await toggleDsaSheetActive(sheetId, active);
  revalidatePath('/sheets');
}

import { getPlatformSettings, savePlatformSettings } from '@/lib/services/platform-settings';

export async function fetchDsaReadmeMarkdown() {
  await requireAuth();
  const settings = await getPlatformSettings();
  return settings.dsa_readme_markdown || '';
}

export async function saveDsaReadmeMarkdown(readmeMarkdown: string) {
  await requireAuth();
  const settings = await getPlatformSettings();
  settings.dsa_readme_markdown = readmeMarkdown;
  await savePlatformSettings(settings);
}
