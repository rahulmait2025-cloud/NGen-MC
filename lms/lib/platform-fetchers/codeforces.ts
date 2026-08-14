import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { DailyPlatformActivity, PlatformFetchResult } from '@/types/student-stats';

type CodeforcesSubmission = {
  id: number;
  creationTimeSeconds: number;
  verdict?: string;
};

export async function fetchCodeforcesActivity(
  studentId: string,
  codeforcesHandle?: string | null,
  targetYear?: number,
  options?: { persistMetadata?: boolean }
): Promise<PlatformFetchResult> {
  if (!codeforcesHandle || !codeforcesHandle.trim()) {
    return { platform: 'codeforces', success: true, activities: [], syncStatus: 'not_configured' };
  }

  const handle = codeforcesHandle.trim();
  const year = targetYear || new Date().getFullYear();

  let accountCreatedAt: string | null = null;

  // 1. Query Codeforces /api/user.info for registration timestamp
  try {
    const infoController = new AbortController();
    const infoTimeoutId = setTimeout(() => infoController.abort(), 7000);

    const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': 'Avesh-LMS-Platform' },
      signal: infoController.signal,
      cache: 'no-store',
    });
    clearTimeout(infoTimeoutId);

    if (infoRes.ok) {
      const infoJson = await infoRes.json();
      if (infoJson.status === 'OK' && Array.isArray(infoJson.result) && infoJson.result.length > 0) {
        const userObj = infoJson.result[0];
        if (userObj.registrationTimeSeconds) {
          accountCreatedAt = new Date(userObj.registrationTimeSeconds * 1000).toISOString();
        }
      }
    }
  } catch {
    // Ignore user.info errors, proceeding to submissions status
  }

  // 2. Paginate Codeforces /api/user.status to fetch ALL submissions without truncation
  const seenSubmissionIds = new Set<number>();
  const allDailyMap: Record<string, number> = {};
  let earliestActivityDate: string | null = null;
  let latestActivityDate: string | null = null;

  const pageSize = 5000;
  let from = 1;
  let hasMore = true;
  let maxPages = 20; // Up to 100,000 submissions
  let lastFetchError: string | undefined;

  try {
    while (hasMore && maxPages > 0) {
      maxPages--;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${pageSize}`,
        {
          headers: { 'User-Agent': 'Avesh-LMS-Platform' },
          signal: controller.signal,
          cache: 'no-store',
        }
      );
      clearTimeout(timeoutId);

      if (!res.ok) {
        lastFetchError = `Codeforces API returned HTTP ${res.status}`;
        return {
          platform: 'codeforces',
          success: false,
          activities: [],
          syncStatus: 'failed',
          error: lastFetchError,
        };
      }

      const json = await res.json();
      if (json.status !== 'OK' || !Array.isArray(json.result)) {
        lastFetchError = json.comment || 'Codeforces API error';
        return {
          platform: 'codeforces',
          success: false,
          activities: [],
          syncStatus: 'failed',
          error: lastFetchError,
        };
      }

      const submissions: CodeforcesSubmission[] = json.result;

      if (submissions.length === 0) {
        hasMore = false;
        break;
      }

      for (const sub of submissions) {
        // Deduplicate using provider submission ID
        if (sub.id && seenSubmissionIds.has(sub.id)) {
          continue;
        }
        if (sub.id) {
          seenSubmissionIds.add(sub.id);
        }

        // Aggregate accepted submissions only ('OK')
        if (sub.verdict === 'OK' && sub.creationTimeSeconds) {
          const subDate = new Date(sub.creationTimeSeconds * 1000);
          const dateStr = subDate.toISOString().split('T')[0];

          if (!earliestActivityDate || dateStr < earliestActivityDate) earliestActivityDate = dateStr;
          if (!latestActivityDate || dateStr > latestActivityDate) latestActivityDate = dateStr;

          allDailyMap[dateStr] = (allDailyMap[dateStr] || 0) + 1;
        }
      }

      if (submissions.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    const nowIso = new Date().toISOString();

    if (options?.persistMetadata !== false) {
      const admin = createAdminClient();
      await admin
        .from('student_platform_metadata')
        .upsert(
          {
            student_id: studentId,
            platform: 'codeforces',
            handle_or_username: handle,
            account_created_at: accountCreatedAt,
            earliest_activity_date: earliestActivityDate,
            latest_activity_date: latestActivityDate,
            metadata_synced_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'student_id, platform' }
        );
    }

    const targetYearPrefix = `${year}-`;
    const activities: DailyPlatformActivity[] = Object.entries(allDailyMap)
      .filter(([date]) => date.startsWith(targetYearPrefix))
      .map(([date, count]) => ({
        date,
        platform: 'codeforces',
        activityCount: count,
        points: count,
      }));

    const syncStatus = activities.length > 0 ? 'success' : 'empty';

    return {
      platform: 'codeforces',
      success: true,
      activities,
      syncStatus,
      accountCreatedAt,
      earliestActivityDate,
      latestActivityDate,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error
      ? (err.name === 'AbortError' ? 'Codeforces API timeout' : err.message)
      : 'Failed to fetch Codeforces activity';
    return {
      platform: 'codeforces',
      success: false,
      activities: [],
      syncStatus: 'failed',
      error: errorMsg,
    };
  }
}
