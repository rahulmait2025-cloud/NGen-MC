import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { DailyPlatformActivity, PlatformFetchResult } from '@/types/student-stats';
import { decryptToken } from '@/lib/security/platform-token-crypto';

export async function fetchGitHubActivityForUsername(
  username: string,
  targetYear: number,
  userAccessToken?: string | null,
): Promise<PlatformFetchResult> {
  const accessToken =
    userAccessToken ||
    process.env.GITHUB_PUBLIC_API_TOKEN ||
    process.env.GITHUB_TOKEN ||
    null;

  const authHeader = accessToken
    ? `Bearer ${accessToken}`
    : process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET
      ? `Basic ${Buffer.from(`${process.env.GITHUB_OAUTH_CLIENT_ID}:${process.env.GITHUB_OAUTH_CLIENT_SECRET}`).toString('base64')}`
      : null;

  try {
    const fromDate = `${targetYear}-01-01T00:00:00.000Z`;
    const toDate = `${targetYear + 1}-01-01T00:00:00.000Z`;

    if (authHeader) {
      const graphqlQuery = {
        query: `
          query ($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
              id
              login
              url
              createdAt
              contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { login: username, from: fromDate, to: toDate },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'User-Agent': 'Avesh-LMS-Platform',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphqlQuery),
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const user = json?.data?.user;

        if (user && (!json.errors || json.errors.length === 0)) {
          const accountCreatedAt = user.createdAt || null;
          const weeks = user.contributionsCollection?.contributionCalendar?.weeks || [];
          const activities: DailyPlatformActivity[] = [];

          let earliestDate: string | null = null;
          let latestDate: string | null = null;

          for (const week of weeks) {
            for (const day of week.contributionDays || []) {
              if (day.contributionCount > 0) {
                activities.push({
                  date: day.date,
                  platform: 'github',
                  activityCount: day.contributionCount,
                  points: day.contributionCount,
                });

                if (!earliestDate || day.date < earliestDate) earliestDate = day.date;
                if (!latestDate || day.date > latestDate) latestDate = day.date;
              }
            }
          }

          const syncStatus = activities.length > 0 ? 'success' : 'empty';

          return {
            platform: 'github',
            success: true,
            activities,
            syncStatus,
            accountCreatedAt,
            earliestActivityDate: earliestDate,
            latestActivityDate: latestDate || null,
          };
        }
      }
    }

    // Public REST API fallback for user contributions / events
    const restHeaders: Record<string, string> = {
      'User-Agent': 'Avesh-LMS-Platform',
      Accept: 'application/vnd.github.v3+json',
    };
    if (authHeader) restHeaders.Authorization = authHeader;

    const restRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100`,
      { headers: restHeaders, cache: 'no-store' }
    );

    if (restRes.ok) {
      const events = await restRes.json();
      if (Array.isArray(events)) {
        const countsByDate: Record<string, number> = {};
        for (const ev of events) {
          if (ev.created_at) {
            const evYear = new Date(ev.created_at).getUTCFullYear();
            if (evYear === targetYear) {
              const dateStr = ev.created_at.split('T')[0];
              countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
            }
          }
        }
        const activities: DailyPlatformActivity[] = Object.entries(countsByDate).map(
          ([date, count]) => ({
            date,
            platform: 'github',
            activityCount: count,
            points: count,
          })
        );
        return {
          platform: 'github',
          success: true,
          activities,
          syncStatus: activities.length > 0 ? 'success' : 'empty',
        };
      }
    }

    return {
      platform: 'github',
      success: false,
      activities: [],
      syncStatus: 'failed',
      error: 'GitHub profile or activity could not be loaded',
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'GitHub API timeout'
          : err.message
        : 'Failed to fetch GitHub activity';
    return {
      platform: 'github',
      success: false,
      activities: [],
      syncStatus: 'failed',
      error: errorMsg,
    };
  }
}

export async function fetchGitHubActivity(
  studentId: string,
  targetYear: number
): Promise<PlatformFetchResult> {
  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from('student_platform_connections')
    .select('provider_username, encrypted_access_token, token_iv, token_auth_tag')
    .eq('student_id', studentId)
    .eq('platform', 'github')
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('[github-fetcher] Failed to query GitHub connection from database');
    return {
      platform: 'github',
      success: false,
      activities: [],
      syncStatus: 'failed',
      error: 'Database error reading GitHub connection',
    };
  }

  if (!connection?.provider_username) {
    return {
      platform: 'github',
      success: false,
      activities: [],
      syncStatus: 'not_configured',
      error: 'No GitHub account is connected',
    };
  }

  let decryptedToken: string | null = null;
  if (
    connection.encrypted_access_token &&
    connection.token_iv &&
    connection.token_auth_tag
  ) {
    try {
      decryptedToken = decryptToken(
        connection.encrypted_access_token,
        connection.token_iv,
        connection.token_auth_tag
      );
    } catch (err) {
      console.warn(
        '[github-fetcher] Token decryption failed, falling back to credentials',
        err
      );
    }
  }

  return fetchGitHubActivityForUsername(
    connection.provider_username,
    targetYear,
    decryptedToken
  );
}
