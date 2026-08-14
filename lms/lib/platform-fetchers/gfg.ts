import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { DailyPlatformActivity, PlatformFetchResult } from '@/types/student-stats';

/**
 * Extracts pure GFG handle from username or full GFG profile URLs
 * (e.g. 'https://www.geeksforgeeks.org/profile/username?tab=activity' -> 'username')
 */
export function extractGFGUsername(raw: string): string {
  let cleaned = raw.trim();
  if (!cleaned) return '';

  const profileMatch = cleaned.match(/(?:geeksforgeeks\.org\/(?:profile|user)\/)([A-Za-z0-9_.-]+)/i);
  if (profileMatch && profileMatch[1]) {
    return profileMatch[1];
  }

  cleaned = cleaned.replace(/^@/, '').split('?')[0].split('/')[0];
  return cleaned;
}

function collectGFGDailySubmissionCounts(result: unknown, year: number): Record<string, number> {
  const counts: Record<string, number> = {};

  if (!result || typeof result !== 'object') return counts;

  for (const [date, count] of Object.entries(result as Record<string, unknown>)) {
    if (!date.startsWith(`${year}-`)) continue;

    const numericCount = Number(count);
    if (Number.isFinite(numericCount) && numericCount > 0) {
      counts[date] = numericCount;
    }
  }

  return counts;
}

export async function fetchGFGActivity(
  studentId: string,
  gfgUsername?: string | null,
  targetYear?: number,
  options?: { persistMetadata?: boolean }
): Promise<PlatformFetchResult> {
  if (!gfgUsername || !gfgUsername.trim()) {
    return { platform: 'gfg', success: true, activities: [], syncStatus: 'not_configured' };
  }

  const username = extractGFGUsername(gfgUsername);
  if (!username) {
    return {
      platform: 'gfg',
      success: false,
      activities: [],
      syncStatus: 'failed',
      error: 'Invalid GeeksforGeeks username or profile URL.',
    };
  }

  const year = targetYear || new Date().getFullYear();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=${encodeURIComponent(username)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.geeksforgeeks.org/'
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        platform: 'gfg',
        success: false,
        activities: [],
        syncStatus: 'failed',
        error: `GFG profile endpoint returned HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    if (!json?.data || !json?.data?.name) {
      return {
        platform: 'gfg',
        success: false,
        activities: [],
        syncStatus: 'failed',
        error: 'GeeksforGeeks username could not be found.',
      };
    }

    const data = json.data;
    const createdDateStr = data.created_date ? data.created_date.split(' ')[0] : null;
    const accountCreatedYear = createdDateStr ? parseInt(createdDateStr.split('-')[0], 10) : null;
    const todayStr = new Date().toISOString().split('T')[0];
    const earliestActivityDate = createdDateStr || todayStr;
    const nowIso = new Date().toISOString();

    // If requested year precedes GFG account creation year, mark as empty success
    if (accountCreatedYear && Number.isInteger(accountCreatedYear) && year < accountCreatedYear) {
      if (options?.persistMetadata !== false) {
        const admin = createAdminClient();
        await admin
          .from('student_platform_metadata')
          .upsert(
            {
              student_id: studentId,
              platform: 'gfg',
              handle_or_username: username,
              account_created_at: data.created_date || null,
              earliest_activity_date: earliestActivityDate,
              metadata_synced_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: 'student_id, platform' }
          );
      }

      return {
        platform: 'gfg',
        success: true,
        activities: [],
        syncStatus: 'empty',
        accountCreatedAt: data.created_date || null,
        earliestActivityDate,
      };
    }

    const activityController = new AbortController();
    const activityTimeoutId = setTimeout(() => activityController.abort(), 8000);

    const activityRes = await fetch('https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://www.geeksforgeeks.org/profile/${encodeURIComponent(username)}?tab=activity`,
        'Origin': 'https://www.geeksforgeeks.org',
      },
      body: JSON.stringify({
        handle: username,
        requestType: 'getYearwiseUserSubmissions',
        year: String(year),
        month: '',
      }),
      signal: activityController.signal,
      cache: 'no-store',
    });
    clearTimeout(activityTimeoutId);

    // CRITICAL REQUIREMENT: Treat HTTP failures on GFG strictly as failed (never convert HTTP errors to empty)
    if (!activityRes.ok) {
      return {
        platform: 'gfg',
        success: false,
        activities: [],
        syncStatus: 'failed',
        error: `GFG submissions endpoint returned HTTP ${activityRes.status}`,
      };
    }

    const activityJson = await activityRes.json();
    const dailyCounts = collectGFGDailySubmissionCounts(activityJson?.result, year);
    const activities: DailyPlatformActivity[] = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        platform: 'gfg',
        activityCount: count,
        points: count,
      }));

    if (options?.persistMetadata !== false) {
      const admin = createAdminClient();
      await admin
        .from('student_platform_metadata')
        .upsert(
          {
            student_id: studentId,
            platform: 'gfg',
            handle_or_username: username,
            account_created_at: data.created_date || null,
            earliest_activity_date: earliestActivityDate,
            latest_activity_date: todayStr,
            metadata_synced_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'student_id, platform' }
        );
    }

    const syncStatus = activities.length > 0 ? 'success' : 'empty';

    return {
      platform: 'gfg',
      success: true,
      activities,
      syncStatus,
      accountCreatedAt: data.created_date || null,
      earliestActivityDate,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error
      ? (err.name === 'AbortError' ? 'GFG API timeout' : err.message)
      : 'Failed to fetch GeeksforGeeks activity';

    return {
      platform: 'gfg',
      success: false,
      activities: [],
      syncStatus: 'failed',
      error: errorMsg,
    };
  }
}
