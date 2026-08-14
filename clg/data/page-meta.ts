export type PageId =
    | 'dashboard'
    | 'analytics'
    | 'students'
    | 'activity'
    | 'video_analytics'
    | 'video_leaderboard';

export const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
    dashboard: {
        title: 'College Dashboard',
        subtitle: 'Overview of student performance, content engagement, and operational health.',
    },
    analytics: {
        title: 'In-Depth Analytics',
        subtitle: 'Comprehensive performance trends, engagement metrics, and placement readiness funnel.',
    },
    students: {
        title: 'My Students',
        subtitle: 'Manage student profiles, enrollments, and academic progress.',
    },
    activity: {
        title: 'Activity & Analytics',
        subtitle: 'Activity logs, performance analytics, video learning, and KPIs.',
    },
    video_analytics: {
        title: 'Video Analytics & Leaderboard',
        subtitle: 'Watch trends, KPIs, and student rankings. Click a student for full stats.',
    },
    video_leaderboard: {
        title: 'Video Analytics & Leaderboard',
        subtitle: 'Watch trends, KPIs, and student rankings. Click a student for full stats.',
    },
};

/**
 * Helper to extract PageId from pathname for College Admin.
 */
export function getPageIdFromPath(pathname: string): PageId {
    if (pathname === '/dashboard' || pathname.endsWith('/dashboard')) return 'dashboard';
    if (pathname === '/students' || pathname.endsWith('/students') || pathname.endsWith('/students/')) return 'students';
    if (pathname.includes('/activity/leaderboard')) return 'video_leaderboard';
    if (pathname.includes('/activity/video')) return 'video_analytics';
    if (pathname.includes('/activity/performance')) return 'analytics';
    if (pathname === '/analytics' || pathname.endsWith('/analytics') || pathname.endsWith('/analytics/')) return 'analytics';
    if (pathname === '/activity' || pathname.match(/\/activity\/?$/)) return 'activity';
    return 'dashboard';
}
