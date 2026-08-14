import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { DailyPlatformActivity, PlatformFetchResult } from '@/types/student-stats';

export function extractLeetCodeUsername(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const profileMatch = trimmed.match(/leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]+)/i);
  if (profileMatch?.[1]) return profileMatch[1];

  return trimmed.replace(/^@/, '').split('?')[0].split('/')[0];
}

export async function fetchLeetCodeActivity(
  studentId: string,
  leetcodeUsername?: string | null,
  targetYear?: number,
  options?: { persistMetadata?: boolean }
): Promise<PlatformFetchResult> {
  if (!leetcodeUsername || !leetcodeUsername.trim()) {
    return { platform: 'leetcode', success: true, activities: [], syncStatus: 'not_configured' };
  }

  const username = extractLeetCodeUsername(leetcodeUsername);
  const year = targetYear || new Date().getFullYear();

  let submissionCalendarObj: Record<string, number> | null = null;
  let lastError: string | null = null;
  let activeYearsFromGraphql: number[] = [];

  // Method 1: Official LeetCode GraphQL API. Year arg is required; without it,
  // LeetCode returns a default calendar that can undercount historical years.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': `https://leetcode.com/u/${encodeURIComponent(username)}/`,
        'Origin': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: `
          query userSearch($username: String!, $year: Int) {
            matchedUser(username: $username) {
              userCalendar(year: $year) {
                activeYears
                submissionCalendar
              }
            }
          }
        `,
        variables: { username, year },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const userCalendar = json?.data?.matchedUser?.userCalendar;
      const calendarStr = userCalendar?.submissionCalendar;
      if (calendarStr) {
        submissionCalendarObj = typeof calendarStr === 'string' ? JSON.parse(calendarStr) : calendarStr;
        activeYearsFromGraphql = Array.isArray(userCalendar?.activeYears)
          ? userCalendar.activeYears.filter((y: unknown): y is number => Number.isInteger(y))
          : [];
      } else if (json?.errors && json.errors.length > 0) {
        lastError = json.errors[0]?.message || 'LeetCode GraphQL error';
      }
    } else {
      lastError = `LeetCode GraphQL returned HTTP ${res.status}`;
    }
  } catch (err: unknown) {
    lastError =
      err instanceof Error && err.name === 'AbortError'
        ? 'LeetCode GraphQL timeout'
        : err instanceof Error
          ? err.message
          : 'LeetCode GraphQL request failed';
  }

  // Method 2: Public LeetCode Stats API Proxy Fallback
  if (!submissionCalendarObj) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const fallbackRes = await fetch(`https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(username)}`, {
        headers: { 'User-Agent': 'Avesh-LMS-Platform' },
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (fallbackRes.ok) {
        const contentType = fallbackRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const fallbackJson = await fallbackRes.json();
          const calendarObj = fallbackJson?.submissionCalendar;
          if (calendarObj) {
            submissionCalendarObj = typeof calendarObj === 'string' ? JSON.parse(calendarObj) : calendarObj;
          } else if (fallbackJson?.message) {
            lastError = fallbackJson.message;
          }
        }
      }
    } catch (err: unknown) {
      if (!lastError) {
        lastError = err instanceof Error ? err.message : 'LeetCode fallback request failed';
      }
    }
  }

  // CRITICAL REQUIREMENT: Record failures strictly as failed (never convert to empty)
  if (!submissionCalendarObj) {
    return {
      platform: 'leetcode',
      success: false,
      activities: [],
      syncStatus: 'failed',
      error: lastError || 'Failed to retrieve LeetCode calendar data',
    };
  }

  const allDailyMap: Record<string, number> = {};
  let earliestActivityDate: string | null = null;
  let latestActivityDate: string | null = null;
  const earliestActiveYear: number | null = activeYearsFromGraphql.length > 0 ? Math.min(...activeYearsFromGraphql) : null;

  for (const [timestampStr, count] of Object.entries(submissionCalendarObj)) {
    const timestamp = parseInt(timestampStr, 10);
    const numCount = Number(count);
    if (!isNaN(timestamp) && Number.isFinite(numCount) && numCount > 0) {
      const d = new Date(timestamp * 1000);
      const dateStr = d.toISOString().split('T')[0];

      if (!earliestActivityDate || dateStr < earliestActivityDate) earliestActivityDate = dateStr;
      if (!latestActivityDate || dateStr > latestActivityDate) latestActivityDate = dateStr;

      allDailyMap[dateStr] = (allDailyMap[dateStr] || 0) + numCount;
    }
  }

  if (!earliestActivityDate && earliestActiveYear !== null) {
    earliestActivityDate = `${earliestActiveYear}-01-01`;
  } else if (earliestActivityDate && earliestActiveYear !== null) {
    earliestActivityDate = [earliestActivityDate, `${earliestActiveYear}-01-01`].sort()[0];
  }

  const nowIso = new Date().toISOString();

  // 1. Partition daily activity for target requested year
  const targetYearPrefix = `${year}-`;
  const activities: DailyPlatformActivity[] = Object.entries(allDailyMap)
    .filter(([date]) => date.startsWith(targetYearPrefix))
    .map(([date, count]) => ({
      date,
      platform: 'leetcode',
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
          platform: 'leetcode',
          handle_or_username: username,
          earliest_activity_date: earliestActivityDate,
          latest_activity_date: latestActivityDate,
          metadata_synced_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'student_id, platform' }
      );
  }

  const syncStatus = activities.length > 0 ? 'success' : 'empty';

  return {
    platform: 'leetcode',
    success: true,
    activities,
    syncStatus,
    earliestActivityDate,
    latestActivityDate,
  };
}
