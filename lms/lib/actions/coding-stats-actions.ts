'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractLeetCodeUsername, fetchLeetCodeActivity } from '@/lib/platform-fetchers/leetcode';
import { fetchCodeforcesActivity } from '@/lib/platform-fetchers/codeforces';
import { fetchGFGActivity, extractGFGUsername } from '@/lib/platform-fetchers/gfg';
import { readStudentCodingStats } from '@/lib/services/student-coding-stats-read';
import { invalidateProfileForUser, invalidateCodePulseCacheForStudent } from '@/lib/profile/public-profile-cache';
import { logCodePulseEvent } from '@/lib/services/code-pulse-logger';
import { getFetcher, toProviderYearFetchResult, ProviderFetchOutcome } from '@/lib/platform-fetchers/fetcher-registry';
import {
  normalizePlatformYearCommitResult,
  PlatformYearCommitResult,
  toRpcAccountMetadata,
} from '@/lib/platform-fetchers/platform-year-commit';
import {
  CodingPlatform,
  PlatformFetchResult,
  PlatformImportBatchResult,
  PlatformProfileInputs,
  PlatformSyncStatus,
  StudentCodingStatsResult,
} from '@/types/student-stats';

type DailyActivityUpsert = {
  student_id: string;
  date: string;
  platform: CodingPlatform;
  activity_count: number;
  points: number;
  updated_at: string;
};

type YearSyncStateUpsert = {
  student_id: string;
  platform: CodingPlatform;
  year: number;
  status: PlatformSyncStatus;
  activity_count: number;
  last_error: string | null;
  fetched_at: string;
  updated_at: string;
};

/**
 * In-process lock Set and cooldown Map.
 * Note: These in-memory stores prevent duplicate syncs and rate-limit rapid requests
 * within the same server Node process instance. They do not act as a distributed lock
 * across independent Vercel serverless instances, which is acceptable given current Code Pulse traffic.
 */
const MAX_YEAR_CONCURRENCY = 2;
const SYNC_COOLDOWN_MS = 60 * 1000; // 60 seconds
const activeSyncLocks = new Set<string>();
const lastSyncAttempts = new Map<string, number>();

function cleanupExpiredCooldowns() {
  const now = Date.now();
  for (const [studentId, timestamp] of lastSyncAttempts.entries()) {
    if (now - timestamp > SYNC_COOLDOWN_MS * 5) {
      lastSyncAttempts.delete(studentId);
    }
  }
}

/**
 * Pure database read function for cached student coding stats.
 * Performs zero outbound HTTP calls to third-party APIs.
 */
export async function getCachedStudentCodingStats(
  requestedYear?: number,
  requestedPlatform?: CodingPlatform | 'combined'
): Promise<StudentCodingStatsResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const student = students && students.length > 0 ? students[0] : null;
  if (!student) return null;

  return readStudentCodingStats({
    userId: user.id,
    studentId: student.id,
    selectedYear: requestedYear,
    selectedPlatform: requestedPlatform,
    identityFallback: {
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      emailPrefix: user.email ? user.email.split('@')[0] : null,
    },
  });
}

/**
 * Validates platform profiles first.
 * If validation fails, leaves existing profiles and cached data completely untouched.
 * If validation succeeds and a handle changed, purges cache ONLY for that platform and saves the new handle.
 */
async function validateAndSaveStudentPlatformProfilesInner(
  profiles: PlatformProfileInputs
): Promise<{
  success: boolean;
  validationError?: string;
  failedPlatform?: CodingPlatform;
  alreadyLinkedPlatforms?: CodingPlatform[];
  changedPlatforms?: CodingPlatform[];
  unlinkedPlatforms?: CodingPlatform[];
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, validationError: 'Unauthorized' };
  }

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id, bio, github_url, linkedin_url, resume_url, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const student = students && students.length > 0 ? students[0] : null;
  if (!student) return { success: false, validationError: 'Student record not found' };

  const currentYear = new Date().getUTCFullYear();
  const changedPlatforms: CodingPlatform[] = [];
  const unlinkedPlatforms: CodingPlatform[] = [];
  const alreadyLinkedPlatforms: CodingPlatform[] = [];

  const clean = (val?: string | null) => (val ? val.trim() : null);

  const { data: metadataRows, error: metadataRowsErr } = await admin
    .from('student_platform_metadata')
    .select('platform, handle_or_username')
    .eq('student_id', student.id)
    .in('platform', ['leetcode', 'codeforces', 'gfg']);

  if (metadataRowsErr) {
    return { success: false, validationError: 'Failed to read linked platform metadata.' };
  }

  const metadataHandles = (metadataRows || []).reduce<Record<string, string | null>>((acc, row) => {
    acc[row.platform] = clean(row.handle_or_username);
    return acc;
  }, {});

  const currentLc = clean(student.leetcode_username) || metadataHandles.leetcode || null;
  const currentCf = clean(student.codeforces_handle) || metadataHandles.codeforces || null;
  const currentGfg = clean(student.gfg_username) || metadataHandles.gfg || null;

  const newLc = profiles.leetcodeUsername !== undefined
    ? (extractLeetCodeUsername(profiles.leetcodeUsername) || null)
    : undefined;
  const newCf = clean(profiles.codeforcesHandle);
  const newGfg = profiles.gfgUsername !== undefined ? (extractGFGUsername(profiles.gfgUsername) || null) : undefined;

  // 1. Validation phase
  if (newLc !== undefined && newLc !== currentLc) {
    if (newLc) {
      const probeRes = await fetchLeetCodeActivity(student.id, newLc, currentYear);
      if (!probeRes.success) {
        return {
          success: false,
          failedPlatform: 'leetcode',
          validationError: 'LeetCode username could not be found.',
        };
      }
      changedPlatforms.push('leetcode');
    } else if (currentLc) {
      unlinkedPlatforms.push('leetcode');
    }
  } else if (newLc && newLc === currentLc) {
    alreadyLinkedPlatforms.push('leetcode');
  }

  if (newCf !== undefined && newCf !== currentCf) {
    if (newCf) {
      const probeRes = await fetchCodeforcesActivity(student.id, newCf, currentYear);
      if (!probeRes.success) {
        return {
          success: false,
          failedPlatform: 'codeforces',
          validationError: 'Codeforces handle could not be found.',
        };
      }
      changedPlatforms.push('codeforces');
    } else if (currentCf) {
      unlinkedPlatforms.push('codeforces');
    }
  } else if (newCf && newCf === currentCf) {
    alreadyLinkedPlatforms.push('codeforces');
  }

  if (newGfg !== undefined && newGfg !== currentGfg) {
    if (newGfg) {
      const probeRes = await fetchGFGActivity(student.id, newGfg, currentYear);
      if (!probeRes.success) {
        return {
          success: false,
          failedPlatform: 'gfg',
          validationError: 'GeeksforGeeks username could not be found.',
        };
      }
      changedPlatforms.push('gfg');
    } else if (currentGfg) {
      unlinkedPlatforms.push('gfg');
    }
  } else if (newGfg && newGfg === currentGfg) {
    alreadyLinkedPlatforms.push('gfg');
  }

  // 2. Apply updates and purge cache for changed or unlinked platforms
  const nowIso = new Date().toISOString();
  const studentIds = [student.id];

  const updateData: Record<string, string | null> = { updated_at: nowIso };

  if (profiles.bio !== undefined) updateData.bio = profiles.bio.trim() || null;
  if (profiles.githubUrl !== undefined) updateData.github_url = profiles.githubUrl.trim() || null;
  if (profiles.leetcodeUsername !== undefined) updateData.leetcode_username = newLc ?? null;
  if (profiles.codeforcesHandle !== undefined) updateData.codeforces_handle = newCf;
  if (profiles.gfgUsername !== undefined) updateData.gfg_username = newGfg ?? null;
  if (profiles.linkedinUrl !== undefined) updateData.linkedin_url = clean(profiles.linkedinUrl);
  if (profiles.portfolioUrl !== undefined) updateData.resume_url = clean(profiles.portfolioUrl);

  // 2. Increment account_version on metadata FIRST for changedPlatforms
  for (const plat of changedPlatforms) {
    const { data: existingMeta } = await admin
      .from('student_platform_metadata')
      .select('account_version')
      .eq('student_id', student.id)
      .eq('platform', plat)
      .maybeSingle();

    const nextVersion = ((existingMeta?.account_version as number | undefined) || 1) + 1;
    const { error: metaErr } = await admin
      .from('student_platform_metadata')
      .upsert({
        student_id: student.id,
        platform: plat,
        account_version: nextVersion,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,platform' });

    if (metaErr) {
      console.error(`[coding-stats-actions] Failed to update metadata version for platform ${plat}:`, metaErr.message);
      return { success: false, validationError: `Failed to update metadata version for ${plat}.` };
    }
  }

  // 3. Update student handles
  const { error: updateErr } = await admin
    .from('students')
    .update(updateData)
    .in('id', studentIds);

  if (updateErr) {
    return { success: false, validationError: 'Failed to update platform handles.' };
  }

  // 4. Clear old activity and sync state ONLY AFTER metadata version and handle updates have succeeded
  for (const plat of unlinkedPlatforms) {
    const { error: delActErr } = await admin
      .from('student_platform_daily_activities')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', plat);
    if (delActErr) console.error(`[coding-stats-actions] Error deleting daily activities for unlinked platform ${plat}:`, delActErr.message);

    const { error: delStateErr } = await admin
      .from('student_platform_year_sync_state')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', plat);
    if (delStateErr) console.error(`[coding-stats-actions] Error deleting sync state for unlinked platform ${plat}:`, delStateErr.message);

    const { error: delMetaErr } = await admin
      .from('student_platform_metadata')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', plat);
    if (delMetaErr) console.error(`[coding-stats-actions] Error deleting metadata for unlinked platform ${plat}:`, delMetaErr.message);
  }

  for (const plat of changedPlatforms) {
    const { error: delActErr } = await admin
      .from('student_platform_daily_activities')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', plat);
    if (delActErr) console.error(`[coding-stats-actions] Error deleting daily activities for changed platform ${plat}:`, delActErr.message);

    const { error: delStateErr } = await admin
      .from('student_platform_year_sync_state')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', plat);
    if (delStateErr) console.error(`[coding-stats-actions] Error deleting sync state for changed platform ${plat}:`, delStateErr.message);
  }

  invalidateCodePulseCacheForStudent(student.id);
  await invalidateProfileForUser(user.id);

  return {
    success: true,
    changedPlatforms,
    unlinkedPlatforms,
    alreadyLinkedPlatforms,
  };
}

export async function validateAndSaveStudentPlatformProfiles(
  profiles: PlatformProfileInputs
): Promise<{
  success: boolean;
  validationError?: string;
  failedPlatform?: CodingPlatform;
  alreadyLinkedPlatforms?: CodingPlatform[];
  changedPlatforms?: CodingPlatform[];
  unlinkedPlatforms?: CodingPlatform[];
}> {
  try {
    return await validateAndSaveStudentPlatformProfilesInner(profiles);
  } catch (error) {
    return {
      success: false,
      validationError: error instanceof Error
        ? `Failed to save platform handles: ${error.message}`
        : 'Failed to save platform handles. Check the server console for details.',
    };
  }
}

export type SaveAndStartImportResult = {
  ok: boolean;
  saved: boolean;
  importStarted: boolean;
  isComplete: boolean;
  importedPlatforms: CodingPlatform[];
  pendingPlatforms: CodingPlatform[];
  processedYears?: number;
  message?: string;
  error?: string;
};

/**
 * Onboarding & profile edit orchestration:
 * 1. Authenticate user & resolve student record.
 * 2. Validate changed provider handles.
 * 3. Save student handle updates & retain metadata.
 * 4. Automatically start the first bounded import batch for changed/connected platforms.
 * 5. Centrally invalidate private Code Pulse & public profile caches.
 * 6. Return structured result for UI refresh.
 */
export async function saveStudentPlatformsAndStartImport(
  profiles: PlatformProfileInputs
): Promise<SaveAndStartImportResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      ok: false,
      saved: false,
      importStarted: false,
      isComplete: false,
      importedPlatforms: [],
      pendingPlatforms: [],
      error: 'Unauthorized',
    };
  }

  const admin = createAdminClient();
  const { data: students, error: studentErr } = await admin
    .from('students')
    .select('id, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (studentErr || !students || students.length === 0) {
    return {
      ok: false,
      saved: false,
      importStarted: false,
      isComplete: false,
      importedPlatforms: [],
      pendingPlatforms: [],
      error: 'Student record not found',
    };
  }

  const student = students[0];

  // 1. Validate & Save platform handles
  const saveRes = await validateAndSaveStudentPlatformProfiles(profiles);
  if (!saveRes.success) {
    return {
      ok: false,
      saved: false,
      importStarted: false,
      isComplete: false,
      importedPlatforms: [],
      pendingPlatforms: [],
      error: saveRes.validationError || 'Profile validation failed',
    };
  }

  // 2. Resolve connected & changed platforms needing import
  const changedPlatforms = saveRes.changedPlatforms || [];

  const { data: updatedStudents } = await admin
    .from('students')
    .select('id, leetcode_username, codeforces_handle, gfg_username')
    .eq('id', student.id)
    .single();

  const activeStudent = updatedStudents || student;

  const { data: ghConn } = await admin
    .from('student_platform_connections')
    .select('student_id')
    .eq('student_id', student.id)
    .eq('platform', 'github')
    .is('revoked_at', null)
    .maybeSingle();

  const connectedPlatforms: CodingPlatform[] = [];
  if (ghConn) connectedPlatforms.push('github');
  if (activeStudent.leetcode_username) connectedPlatforms.push('leetcode');
  if (activeStudent.codeforces_handle) connectedPlatforms.push('codeforces');
  if (activeStudent.gfg_username) connectedPlatforms.push('gfg');

  const targetPlatforms = Array.from(new Set([...changedPlatforms, ...connectedPlatforms]));

  if (targetPlatforms.length === 0) {
    invalidateCodePulseCacheForStudent(student.id);
    await invalidateProfileForUser(user.id);

    return {
      ok: true,
      saved: true,
      importStarted: false,
      isComplete: true,
      importedPlatforms: [],
      pendingPlatforms: [],
      message: 'Profile saved successfully.',
    };
  }

  const importedPlatforms: CodingPlatform[] = [];
  const pendingPlatforms: CodingPlatform[] = [];
  let totalProcessedYears = 0;
  let allComplete = true;

  // 3. Import full provider-discovered history. Each batch stays bounded, but this loop
  // continues until the platform reports no remaining years.
  for (const plat of targetPlatforms) {
    try {
      const attemptedYears: number[] = [];
      let isComplete = false;
      let guard = 0;

      importedPlatforms.push(plat);

      while (!isComplete) {
        const batchRes = await importStudentPlatformBatch(plat, MAX_YEAR_CONCURRENCY, attemptedYears);
        guard++;

        totalProcessedYears += batchRes.processedYears.length;
        attemptedYears.push(...batchRes.processedYears);
        isComplete = batchRes.isComplete;

        if (batchRes.processedYears.length === 0 || guard > Math.max(batchRes.totalYears + 2, 10)) {
          break;
        }
      }

      if (!isComplete) {
        pendingPlatforms.push(plat);
        allComplete = false;
      }
    } catch (err) {
      console.error(`[coding-stats-actions] Automatic import batch failed for ${plat}:`, err);
      pendingPlatforms.push(plat);
      allComplete = false;
    }
  }

  // 4. Centralized Cache Invalidation after committed import
  invalidateCodePulseCacheForStudent(student.id);
  await invalidateProfileForUser(user.id);
  logCodePulseEvent('code_pulse_cache_invalidated', { studentId: student.id });

  return {
    ok: true,
    saved: true,
    importStarted: true,
    isComplete: allComplete,
    importedPlatforms,
    pendingPlatforms,
    processedYears: totalProcessedYears,
    message: allComplete
      ? 'Profiles saved and coding history imported successfully.'
      : 'Profiles saved and initial coding history import started.',
  };
}

export async function commitPlatformYearActivityInner(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    studentId: string;
    platform: CodingPlatform;
    year: number;
    accountVersion: number;
    fetchOutcome: ProviderFetchOutcome;
    activities: Array<{ date: string; activityCount: number; points: number }>;
    accountMetadata?: {
      accountCreatedAt?: string | null;
      earliestActivityDate?: string | null;
      latestActivityDate?: string | null;
    } | null;
    safeErrorCode?: string | null;
    safeErrorMessage?: string | null;
    fetchedAt?: string;
  }
): Promise<PlatformYearCommitResult> {
  try {
    const { data: rpcRes, error: rpcErr } = await admin.rpc('commit_student_platform_year_activity', {
      p_student_id: params.studentId,
      p_platform: params.platform,
      p_year: params.year,
      p_account_version: params.accountVersion,
      p_fetch_outcome: params.fetchOutcome,
      p_activities: params.activities.map((a) => ({
        date: a.date,
        activity_count: a.activityCount,
        points: a.points,
      })),
      p_account_metadata: toRpcAccountMetadata(params.accountMetadata),
      p_safe_error_code: params.safeErrorCode || null,
      p_safe_error_message: params.safeErrorMessage || null,
      p_fetched_at: params.fetchedAt || new Date().toISOString(),
    });

    if (!rpcErr) {
      const normalized = normalizePlatformYearCommitResult(rpcRes);
      if (normalized) return normalized;
    }
  } catch (e) {
    console.warn('[commitPlatformYearActivityInner] RPC unavailable or error:', e);
  }

  logCodePulseEvent('coding_pulse.import.migration_required', {
    studentId: params.studentId,
    platform: params.platform,
    year: params.year,
    status: 'migration_required',
    error: 'Database migration required: RPC commit_student_platform_year_activity missing',
  });

  // Structured migration_required response when RPC is missing or unapplied
  return {
    success: false,
    status: 'migration_required',
    committed: false,
    activityCount: 0,
    error: 'Database migration required: commit_student_platform_year_activity RPC is missing or unapplied',
  };
}

/**
 * Process a batch of historical or missing syncs for a target platform.
 * Accepts `attemptedYears` array to prevent infinite retry loops on continuously failing years in a session.
 */
export async function importStudentPlatformBatch(
  platform: CodingPlatform,
  batchSize: number = 2,
  attemptedYears: number[] = []
): Promise<PlatformImportBatchResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      platform,
      processedYears: [],
      completedYears: 0,
      totalYears: 0,
      remainingYears: 0,
      isComplete: true,
      hasErrors: true,
      sanitizedError: 'Unauthorized',
    };
  }

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id, github_url, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const student = students && students.length > 0 ? students[0] : null;
  if (!student) {
    return {
      ok: false,
      platform,
      processedYears: [],
      completedYears: 0,
      totalYears: 0,
      remainingYears: 0,
      isComplete: true,
      hasErrors: true,
      sanitizedError: 'Student record not found',
    };
  }

  if (platform === 'github') {
    return {
      ok: true,
      platform,
      processedYears: [],
      completedYears: 0,
      totalYears: 0,
      remainingYears: 0,
      didCommit: false,
      isComplete: true,
      hasErrors: false,
    };
  }

  // 1. Determine platform handle, active account version & start year
  let isConfigured = false;
  let handle: string | null = null;
  let accountCreatedAt: string | null = null;
  let earliestActivityDate: string | null = null;
  let accountVersion = 1;

  const { data: metaRow } = await admin
    .from('student_platform_metadata')
    .select('handle_or_username, account_created_at, earliest_activity_date, account_version')
    .eq('student_id', student.id)
    .eq('platform', platform)
    .maybeSingle();

  if (metaRow?.account_version) {
    accountVersion = metaRow.account_version as number;
  }

  const currentHandle =
    platform === 'leetcode'
      ? student.leetcode_username
      : platform === 'codeforces'
      ? student.codeforces_handle
      : student.gfg_username;

  if (currentHandle) {
    isConfigured = true;
    handle = currentHandle;
    accountCreatedAt = metaRow?.account_created_at || null;
    earliestActivityDate = metaRow?.earliest_activity_date || null;
  }

  if (!isConfigured || !handle) {
    return {
      ok: true,
      platform,
      processedYears: [],
      completedYears: 0,
      totalYears: 0,
      remainingYears: 0,
      isComplete: true,
      hasErrors: false,
    };
  }

  const currentYear = new Date().getFullYear();
  let startYear = currentYear;

  if (accountCreatedAt) {
    const y = new Date(accountCreatedAt).getUTCFullYear();
    if (!isNaN(y) && y >= 2000 && y <= currentYear) startYear = y;
  } else if (earliestActivityDate) {
    const y = new Date(earliestActivityDate).getUTCFullYear();
    if (!isNaN(y) && y >= 2000 && y <= currentYear) startYear = y;
  }

  let availableYears: number[] = [];
  for (let y = startYear; y <= currentYear; y++) availableYears.push(y);
  availableYears.reverse(); // [currentYear, previousYear, ...]

  // 2. Fetch existing sync states for this platform
  const { data: syncRows } = await admin
    .from('student_platform_year_sync_state')
    .select('year, status, fetched_at')
    .eq('student_id', student.id)
    .eq('platform', platform);

  const existingSyncMap: Record<number, { status: string; fetched_at: string }> = {};
  if (syncRows) {
    for (const r of syncRows) {
      existingSyncMap[r.year] = r;
    }
  }

  // 3. Identify missing/retryable years
  const retryableYears: number[] = [];
  const completedYearList: number[] = [];
  const failedYears: number[] = [];

  for (const y of availableYears) {
    const st = existingSyncMap[y];

    if (st && (st.status === 'success' || st.status === 'empty')) {
      completedYearList.push(y);
    } else if (st && st.status === 'failed') {
      failedYears.push(y);
    }

    if (y === currentYear) {
      if (!attemptedYears.includes(y)) {
        retryableYears.push(y);
      }
    } else if (!st || (st.status !== 'success' && st.status !== 'empty')) {
      if (!attemptedYears.includes(y)) {
        retryableYears.push(y);
      }
    }
  }

  if (retryableYears.length === 0) {
    const updatedStats = await getCachedStudentCodingStats(currentYear);
    return {
      ok: true,
      platform,
      requestedYears: [],
      results: [],
      processedYears: [],
      completedYears: completedYearList.length,
      completedYearList,
      failedYears,
      pendingYears: [],
      totalYears: availableYears.length,
      remainingYears: 0,
      didCommit: false,
      isComplete: true,
      hasErrors: failedYears.length > 0,
      syncStatusByPlatform: updatedStats?.syncStatusByPlatform,
      activitiesMap: updatedStats?.activitiesMap,
    };
  }

  // 4. Select batch with bounded concurrency
  const effectiveBatchSize = Math.min(batchSize, MAX_YEAR_CONCURRENCY);
  const targetBatch = retryableYears.slice(0, effectiveBatchSize);

  const nowIso = new Date().toISOString();
  const pendingRecords = targetBatch.map((y) => ({
    student_id: student.id,
    platform,
    year: y,
    status: 'pending',
    updated_at: nowIso,
  }));

  await admin
    .from('student_platform_year_sync_state')
    .upsert(pendingRecords, { onConflict: 'student_id,platform,year' });

  // 5. Run isolated fetches for the batch concurrently
  const fetchPromises = targetBatch.map((y) => {
    const fetcher = getFetcher(platform);
    return fetcher.fetch(student.id, {
      leetcodeUsername: handle,
      codeforcesHandle: handle,
      gfgUsername: handle,
    }, y);
  });

  const settledResults = await Promise.allSettled(fetchPromises);
  const yearResults = [];
  let anyCommitted = false;
  let batchHasErrors = false;

  for (let i = 0; i < targetBatch.length; i++) {
    const y = targetBatch[i];
    const resOutcome = settledResults[i];

    if (resOutcome.status === 'fulfilled') {
      const fetchRes = resOutcome.value;
      const canonical = toProviderYearFetchResult(platform, y, fetchRes);

      const commitRes = await commitPlatformYearActivityInner(admin, {
        studentId: student.id,
        platform,
        year: y,
        accountVersion,
        fetchOutcome: canonical.outcome,
        activities: fetchRes.activities.map((a) => ({
          date: a.date,
          activityCount: a.activityCount,
          points: a.points,
        })),
        accountMetadata: canonical.accountMetadata,
        safeErrorCode: canonical.errorCode,
        safeErrorMessage: canonical.safeErrorMessage,
        fetchedAt: nowIso,
      });

      if (commitRes.committed) {
        anyCommitted = true;
      }

      if (commitRes.status === 'failed' || commitRes.status === 'stale_account') {
        batchHasErrors = true;
      }

      yearResults.push({
        year: y,
        status: commitRes.status,
        committed: commitRes.committed,
        activityCount: typeof commitRes.activityCount === 'number' && Number.isFinite(commitRes.activityCount) ? commitRes.activityCount : 0,
        retryable: canonical.outcome === 'retryable_error',
        errorCode: canonical.errorCode || undefined,
        message: commitRes.error || undefined,
      });
    } else {
      const errCommitRes = await commitPlatformYearActivityInner(admin, {
        studentId: student.id,
        platform,
        year: y,
        accountVersion,
        fetchOutcome: 'retryable_error',
        activities: [],
        safeErrorMessage: String(resOutcome.reason),
        fetchedAt: nowIso,
      });

      if (errCommitRes.committed) {
        anyCommitted = true;
      }

      yearResults.push({
        year: y,
        status: 'failed' as const,
        committed: false,
        activityCount: 0,
        retryable: true,
        message: errCommitRes.error || String(resOutcome.reason),
      });
    }
  }

  // Centralized Cache Invalidation after transaction commits
  if (yearResults.length > 0) {
    invalidateCodePulseCacheForStudent(student.id);
  }
  if (anyCommitted) {
    await invalidateProfileForUser(user.id);
  }

  const discoveredStartYears = settledResults
    .filter((result): result is PromiseFulfilledResult<PlatformFetchResult> => result.status === 'fulfilled')
    .flatMap((result) => [result.value.accountCreatedAt, result.value.earliestActivityDate])
    .map((date) => (date ? new Date(date).getUTCFullYear() : null))
    .filter((year): year is number => year !== null && !isNaN(year) && year <= currentYear);

  if (discoveredStartYears.length > 0) {
    const discoveredStartYear = Math.min(...discoveredStartYears);
    if (discoveredStartYear < startYear) {
      startYear = discoveredStartYear;
      availableYears = [];
      for (let y = startYear; y <= currentYear; y++) availableYears.push(y);
      availableYears.reverse();
    }
  }

  const completedYearSet = new Set(completedYearList);
  const failedYearSet = new Set(failedYears);
  for (const result of yearResults) {
    if (result.status === 'success' || result.status === 'empty') {
      completedYearSet.add(result.year);
      failedYearSet.delete(result.year);
    } else if (result.status === 'failed') {
      failedYearSet.add(result.year);
    }
  }

  const completedYearsAfterBatch = Array.from(completedYearSet).sort((a, b) => b - a);
  const failedYearsAfterBatch = Array.from(failedYearSet).sort((a, b) => b - a);
  const pendingYearsAfterBatch = availableYears.filter((year) => !completedYearSet.has(year));
  const remainingAfterBatch = pendingYearsAfterBatch.length;
  const isComplete = remainingAfterBatch <= 0;

  return {
    ok: true,
    platform,
    requestedYears: targetBatch,
    results: yearResults,
    processedYears: targetBatch,
    completedYears: completedYearsAfterBatch.length,
    completedYearList: completedYearsAfterBatch,
    failedYears: failedYearsAfterBatch,
    pendingYears: pendingYearsAfterBatch,
    totalYears: availableYears.length,
    remainingYears: remainingAfterBatch,
    didCommit: anyCommitted,
    isComplete,
    hasErrors: batchHasErrors,
  };
}

/**
 * Action triggered by the "Sync Stats" button.
 * Syncs complete available history of all linked platforms automatically up to the current date.
 */
export async function syncCurrentStudentCodingStats(
  targetPlatforms?: CodingPlatform[]
): Promise<{
  success: boolean;
  message: string;
  hasErrors: boolean;
  statusSummary?: 'fully_completed' | 'partially_completed' | 'failed' | 'sync_already_running' | 'sync_cooldown';
  remainingCooldownSeconds?: number;
  updatedStats?: StudentCodingStatsResult | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Unauthorized', hasErrors: true, statusSummary: 'failed' };
  }

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const student = students && students.length > 0 ? students[0] : null;
  if (!student) {
    return { success: false, message: 'Student record not found', hasErrors: true, statusSummary: 'failed' };
  }

  // 1. Prevent overlapping sync requests on the same server process
  if (activeSyncLocks.has(student.id)) {
    logCodePulseEvent('code_pulse_sync_lock_rejected', { studentId: student.id, status: 'sync_already_running' });
    return {
      success: false,
      message: 'Sync is already in progress on this server instance.',
      hasErrors: false,
      statusSummary: 'sync_already_running',
    };
  }

  // 2. Enforce 60-second server cooldown per student
  cleanupExpiredCooldowns();
  const now = Date.now();
  const lastAttemptTime = lastSyncAttempts.get(student.id);

  if (lastAttemptTime && now - lastAttemptTime < SYNC_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((SYNC_COOLDOWN_MS - (now - lastAttemptTime)) / 1000);
    logCodePulseEvent('code_pulse_sync_lock_rejected', { studentId: student.id, status: 'sync_cooldown' });
    return {
      success: false,
      message: `Please wait ${remainingSeconds}s before syncing again.`,
      hasErrors: false,
      statusSummary: 'sync_cooldown',
      remainingCooldownSeconds: remainingSeconds,
    };
  }

  // Record attempt timestamp and acquire local in-process lock
  lastSyncAttempts.set(student.id, now);
  activeSyncLocks.add(student.id);
  const syncStartTime = Date.now();
  logCodePulseEvent('code_pulse_sync_started', { studentId: student.id });

  try {
    const currentYear = new Date().getUTCFullYear();
    const { data: ghConn } = await admin
      .from('student_platform_connections')
      .select('student_id')
      .eq('student_id', student.id)
      .eq('platform', 'github')
      .is('revoked_at', null)
      .maybeSingle();

    const allPlatforms: CodingPlatform[] = ['github', 'leetcode', 'codeforces', 'gfg'];
    const activePlatforms = targetPlatforms || allPlatforms;

    const configuredPlatforms: CodingPlatform[] = activePlatforms.filter((p) => {
      if (p === 'github') return !!ghConn;
      if (p === 'leetcode') return !!student.leetcode_username;
      if (p === 'codeforces') return !!student.codeforces_handle;
      if (p === 'gfg') return !!student.gfg_username;
      return false;
    });

    if (configuredPlatforms.length === 0) {
      return { success: false, message: 'No coding platforms are connected.', hasErrors: false, statusSummary: 'failed' };
    }

    let totalErrors = 0;
    let totalSuccesses = 0;

    for (const plat of configuredPlatforms) {
      let isComplete = false;
      const attemptedYears: number[] = [];
      let iterations = 0;

      while (!isComplete) {
        iterations++;
        const batchRes = await importStudentPlatformBatch(plat, MAX_YEAR_CONCURRENCY, attemptedYears);

        if (iterations > Math.max(batchRes.totalYears + 2, 10)) {
          totalErrors++;
          break;
        }

        if (batchRes.processedYears.length === 0) {
          if (batchRes.hasErrors) totalErrors++;
          else totalSuccesses++;
          break;
        }

        attemptedYears.push(...batchRes.processedYears);
        isComplete = batchRes.isComplete;

        if (batchRes.hasErrors) {
          totalErrors++;
        } else {
          totalSuccesses++;
        }
      }
    }

    // Invalidate student-specific & username public profile caches once after complete sync
    if (totalSuccesses > 0) {
      invalidateCodePulseCacheForStudent(student.id);
      await invalidateProfileForUser(user.id);
      logCodePulseEvent('code_pulse_cache_invalidated', { studentId: student.id });
    }

    const durationMs = Date.now() - syncStartTime;
    const updatedStats = await getCachedStudentCodingStats(currentYear);

    if (totalSuccesses > 0 && totalErrors === 0) {
      logCodePulseEvent('code_pulse_sync_completed', { studentId: student.id, durationMs, status: 'fully_completed' });
      return { success: true, message: 'Coding stats synced successfully.', hasErrors: false, statusSummary: 'fully_completed', updatedStats };
    } else if (totalSuccesses > 0 && totalErrors > 0) {
      logCodePulseEvent('code_pulse_sync_partially_completed', { studentId: student.id, durationMs, status: 'partially_completed' });
      return { success: true, message: 'Coding stats synced with some platform errors.', hasErrors: true, statusSummary: 'partially_completed', updatedStats };
    }

    logCodePulseEvent('code_pulse_year_failed', { studentId: student.id, durationMs, status: 'failed' });
    return { success: false, message: 'Coding stats could not be synced. Please try again.', hasErrors: true, statusSummary: 'failed', updatedStats };
  } finally {
    activeSyncLocks.delete(student.id);
  }
}

export async function syncStudentPlatformYear(
  requestedYear: number,
  targetPlatforms?: CodingPlatform[],
  _forceRefresh: boolean = false
): Promise<StudentCodingStatsResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const student = students && students.length > 0 ? students[0] : null;
  if (!student) return null;

  const currentYear = new Date().getFullYear();
  const selectedYear = requestedYear && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : currentYear;

  const allPlatforms: CodingPlatform[] = ['github', 'leetcode', 'codeforces', 'gfg'];
  const filterList = targetPlatforms && targetPlatforms.length > 0 ? targetPlatforms : allPlatforms;

  const fetchPromises: Promise<PlatformFetchResult>[] = [];
  const platformsToFetch: CodingPlatform[] = [];

  for (const p of filterList) {
    if (p === 'github') continue;

    let isConfigured = false;
    if (p === 'leetcode') isConfigured = !!student.leetcode_username;
    else if (p === 'codeforces') isConfigured = !!student.codeforces_handle;
    else if (p === 'gfg') isConfigured = !!student.gfg_username;

    if (!isConfigured) continue;

    platformsToFetch.push(p);
    const fetcher = getFetcher(p);
    fetchPromises.push(fetcher.fetch(student.id, {
      leetcodeUsername: student.leetcode_username,
      codeforcesHandle: student.codeforces_handle,
      gfgUsername: student.gfg_username,
    }, selectedYear));
  }

  if (platformsToFetch.length > 0) {
    const settledResults = await Promise.allSettled(fetchPromises);
    const nowIso = new Date().toISOString();
    const allUpsertDailyRecords: DailyActivityUpsert[] = [];
    const syncStateRecords: YearSyncStateUpsert[] = [];

    for (let i = 0; i < platformsToFetch.length; i++) {
      const platform = platformsToFetch[i];
      const resOutcome = settledResults[i];

      if (resOutcome.status === 'fulfilled') {
        const fetchRes = resOutcome.value;
        if (fetchRes.success && fetchRes.activities.length > 0) {
          for (const act of fetchRes.activities) {
            allUpsertDailyRecords.push({
              student_id: student.id,
              date: act.date,
              platform: act.platform,
              activity_count: act.activityCount,
              points: act.points,
              updated_at: nowIso,
            });
          }
        }

        syncStateRecords.push({
          student_id: student.id,
          platform,
          year: selectedYear,
          status: fetchRes.syncStatus,
          activity_count: fetchRes.activities.length,
          last_error: fetchRes.error || null,
          fetched_at: nowIso,
          updated_at: nowIso,
        });
      } else {
        syncStateRecords.push({
          student_id: student.id,
          platform,
          year: selectedYear,
          status: 'failed',
          activity_count: 0,
          last_error: String(resOutcome.reason),
          fetched_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    for (const syncState of syncStateRecords) {
      if (syncState.status !== 'success' && syncState.status !== 'empty') continue;

      const nextYear = syncState.year + 1;
      await admin
        .from('student_platform_daily_activities')
        .delete()
        .eq('student_id', student.id)
        .eq('platform', syncState.platform)
        .gte('date', `${syncState.year}-01-01`)
        .lt('date', `${nextYear}-01-01`);
    }

    if (allUpsertDailyRecords.length > 0) {
      await admin
        .from('student_platform_daily_activities')
        .upsert(allUpsertDailyRecords, { onConflict: 'student_id,date,platform' });
    }

    if (syncStateRecords.length > 0) {
      await admin
        .from('student_platform_year_sync_state')
        .upsert(syncStateRecords, { onConflict: 'student_id,platform,year' });
    }

    await invalidateProfileForUser(user.id);
  }

  return getCachedStudentCodingStats(selectedYear);
}

export async function getStudentCodingStats(
  yearParam?: number,
  platformParam?: CodingPlatform | 'combined'
) {
  return getCachedStudentCodingStats(yearParam, platformParam);
}

export async function hasStudentConnectedCodingPlatform(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const student = students && students.length > 0 ? students[0] : null;
  if (!student) return false;

  if (student.leetcode_username || student.codeforces_handle || student.gfg_username) {
    return true;
  }

  const { data: githubConnection } = await admin
    .from('student_platform_connections')
    .select('id')
    .eq('student_id', student.id)
    .eq('platform', 'github')
    .is('revoked_at', null)
    .maybeSingle();

  return !!githubConnection;
}

export async function saveStudentPlatformProfiles(profiles: PlatformProfileInputs) {
  const res = await validateAndSaveStudentPlatformProfiles(profiles);
  if (!res.success) {
    return { error: res.validationError || 'Failed to save profiles' };
  }
  return { success: true, changedPlatforms: res.changedPlatforms };
}

export async function unlinkStudentPlatform(
  platform: 'github' | 'leetcode' | 'codeforces' | 'gfg' | 'linkedin' | 'portfolio'
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id')
    .eq('user_id', user.id);

  if (!students || students.length === 0) return { error: 'Student record not found' };

  const nowIso = new Date().toISOString();
  const studentIds = students.map((s) => s.id);
  const columnMap: Record<string, string> = {
    github: 'github_url',
    leetcode: 'leetcode_username',
    codeforces: 'codeforces_handle',
    gfg: 'gfg_username',
    linkedin: 'linkedin_url',
    portfolio: 'resume_url',
  };

  const targetColumn = columnMap[platform];
  if (!targetColumn) return { error: 'Invalid platform' };

  const { error: updateErr } = await admin
    .from('students')
    .update({ [targetColumn]: null, updated_at: nowIso })
    .in('id', studentIds);

  if (updateErr) return { error: `Failed to unlink ${platform}` };

  if (['github', 'leetcode', 'codeforces', 'gfg'].includes(platform)) {
    await admin
      .from('student_platform_daily_activities')
      .delete()
      .in('student_id', studentIds)
      .eq('platform', platform);

    await admin
      .from('student_platform_year_sync_state')
      .delete()
      .in('student_id', studentIds)
      .eq('platform', platform);

    await admin
      .from('student_platform_metadata')
      .delete()
      .in('student_id', studentIds)
      .eq('platform', platform);
  }

  if (platform === 'github') {
    await admin
      .from('student_platform_connections')
      .update({ revoked_at: nowIso, updated_at: nowIso })
      .in('student_id', studentIds)
      .eq('platform', 'github')
      .is('revoked_at', null);
  }

  if (studentIds[0]) {
    invalidateCodePulseCacheForStudent(studentIds[0]);
  }
  await invalidateProfileForUser(user.id);

  return { success: true };
}

export async function getStudentProfileHandles(): Promise<PlatformProfileInputs | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: students, error } = await admin
    .from('students')
    .select('bio, github_url, linkedin_url, resume_url, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error || !students || students.length === 0) return null;

  const student = students[0];

  return {
    bio: student.bio || '',
    githubUrl: student.github_url || '',
    linkedinUrl: student.linkedin_url || '',
    portfolioUrl: student.resume_url || '',
    leetcodeUsername: student.leetcode_username || '',
    codeforcesHandle: student.codeforces_handle || '',
    gfgUsername: student.gfg_username || '',
  };
}

export type PlatformImportStatusInfo = {
  platform: CodingPlatform;
  isConfigured: boolean;
  totalYears: number;
  completedYears: number;
  remainingYears: number;
  isComplete: boolean;
};

export type StudentCodePulseImportStatusResult = {
  success: boolean;
  overallComplete: boolean;
  connectedPlatforms: CodingPlatform[];
  platformStatuses: Record<CodingPlatform, PlatformImportStatusInfo>;
  error?: string;
};

export async function getStudentCodePulseImportStatus(): Promise<StudentCodePulseImportStatusResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      success: false,
      overallComplete: true,
      connectedPlatforms: [],
      platformStatuses: {
        github: { platform: 'github', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
        leetcode: { platform: 'leetcode', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
        codeforces: { platform: 'codeforces', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
        gfg: { platform: 'gfg', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
      },
      error: 'Unauthorized',
    };
  }

  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('id, leetcode_username, codeforces_handle, gfg_username')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const student = students && students.length > 0 ? students[0] : null;
  if (!student) {
    return {
      success: false,
      overallComplete: true,
      connectedPlatforms: [],
      platformStatuses: {
        github: { platform: 'github', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
        leetcode: { platform: 'leetcode', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
        codeforces: { platform: 'codeforces', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
        gfg: { platform: 'gfg', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
      },
      error: 'Student record not found',
    };
  }

  const { data: ghConn } = await admin
    .from('student_platform_connections')
    .select('provider_username, account_created_at, earliest_activity_date')
    .eq('student_id', student.id)
    .eq('platform', 'github')
    .is('revoked_at', null)
    .maybeSingle();

  const { data: metadataRows } = await admin
    .from('student_platform_metadata')
    .select('platform, account_created_at, earliest_activity_date')
    .eq('student_id', student.id);

  const metaMap = (metadataRows || []).reduce<Record<string, { account_created_at: string | null; earliest_activity_date: string | null }>>((acc, r) => {
    acc[r.platform] = r;
    return acc;
  }, {});

  const { data: syncStateRows } = await admin
    .from('student_platform_year_sync_state')
    .select('platform, year, status')
    .eq('student_id', student.id);

  const syncStateMap: Record<string, Record<number, string>> = {};
  if (syncStateRows) {
    for (const r of syncStateRows) {
      if (!syncStateMap[r.platform]) syncStateMap[r.platform] = {};
      syncStateMap[r.platform][r.year] = r.status;
    }
  }

  const currentYear = new Date().getUTCFullYear();
  const allPlatforms: CodingPlatform[] = ['github', 'leetcode', 'codeforces', 'gfg'];
  const connectedPlatforms: CodingPlatform[] = [];
  const platformStatuses: Record<CodingPlatform, PlatformImportStatusInfo> = {
    github: { platform: 'github', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
    leetcode: { platform: 'leetcode', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
    codeforces: { platform: 'codeforces', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
    gfg: { platform: 'gfg', isConfigured: false, totalYears: 0, completedYears: 0, remainingYears: 0, isComplete: true },
  };

  let overallComplete = true;

  for (const platform of allPlatforms) {
    let isConfigured = false;
    let accountCreatedAt: string | null = null;
    let earliestActivityDate: string | null = null;

    if (platform === 'github') {
      if (ghConn) {
        isConfigured = true;
        accountCreatedAt = ghConn.account_created_at;
        earliestActivityDate = ghConn.earliest_activity_date;
      }
    } else {
      const handle =
        platform === 'leetcode'
          ? student.leetcode_username
          : platform === 'codeforces'
          ? student.codeforces_handle
          : student.gfg_username;

      if (handle) {
        isConfigured = true;
        const meta = metaMap[platform];
        accountCreatedAt = meta?.account_created_at || null;
        earliestActivityDate = meta?.earliest_activity_date || null;
      }
    }

    if (!isConfigured) {
      platformStatuses[platform] = {
        platform,
        isConfigured: false,
        totalYears: 0,
        completedYears: 0,
        remainingYears: 0,
        isComplete: true,
      };
      continue;
    }

    connectedPlatforms.push(platform);

    if (platform === 'github') {
      platformStatuses.github = {
        platform: 'github',
        isConfigured: true,
        totalYears: 0,
        completedYears: 0,
        remainingYears: 0,
        isComplete: true,
      };
      continue;
    }

    let startYear = currentYear;
    if (accountCreatedAt) {
      const y = new Date(accountCreatedAt).getUTCFullYear();
      if (!isNaN(y) && y >= 2000 && y <= currentYear) startYear = y;
    } else if (earliestActivityDate) {
      const y = new Date(earliestActivityDate).getUTCFullYear();
      if (!isNaN(y) && y >= 2000 && y <= currentYear) startYear = y;
    }

    const availableYears: number[] = [];
    for (let y = startYear; y <= currentYear; y++) availableYears.push(y);

    const platformSyncStates = syncStateMap[platform] || {};
    let completedYears = 0;

    for (const y of availableYears) {
      const st = platformSyncStates[y];
      if (st === 'success' || st === 'empty') {
        completedYears++;
      }
    }

    const remainingYears = Math.max(0, availableYears.length - completedYears);
    const isComplete = remainingYears === 0;

    if (!isComplete) overallComplete = false;

    platformStatuses[platform] = {
      platform,
      isConfigured: true,
      totalYears: availableYears.length,
      completedYears,
      remainingYears,
      isComplete,
    };
  }

  return {
    success: true,
    overallComplete,
    connectedPlatforms,
    platformStatuses,
  };
}
