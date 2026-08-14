/** Read-only Learning Analytics service types (Super Admin). */

export interface LearningAnalyticsTotals {
  totalColleges: number;
  totalStudents: number;
  activeLearningStudents: number;
  totalWatchSeconds: number;
  totalWatchHours: number;
  totalLecturesWatched: number;
  totalCompletedLectures: number;
  averageCompletionPercentage: number;
  totalAvailableVideos: number;
  totalWatchedVideos: number;
  totalNotStartedVideos: number;
}

export interface WeeklyActiveTrendPoint {
  weekLabel: string;
  weekStart: string;
  activeStudents: number;
  totalWatchHours: number;
}

export interface PlatformAlertSummary {
  atRiskStudentCount: number | null;
  totalStudentsWithStreaks: number | null;
  averageStreakLength: number | null;
  totalActiveStreaks: number | null;
}

export interface ContentFunnelPoint {
  courseId: string;
  courseTitle: string;
  totalVideos: number;
  watchedVideos: number;
  completedVideos: number;
  completionPercentage: number;
}

export interface LearningAnalyticsCollegeRow {
  collegeId: string;
  collegeName: string;
  collegeSlug: string | null;
  totalStudents: number;
  activeLearningStudents: number;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  lastActivityAt: string | null;
}

export interface LearningAnalyticsDailyPoint {
  label: string;
  date: string;
  watchedHours: number;
  lecturesWatched: number;
  completedLectures: number;
}

export interface LearningAnalyticsWeeklyPoint {
  label: string;
  weekStart: string;
  weekEnd: string;
  watchedHours: number;
  lecturesWatched: number;
  completedLectures: number;
}

export interface LearningAnalyticsPieSlice {
  name: string;
  value: number;
}

export interface LearningAnalyticsCharts {
  dailyCurrentWeek: LearningAnalyticsDailyPoint[];
  weeklyCurrentMonth: LearningAnalyticsWeeklyPoint[];
  contentPie: LearningAnalyticsPieSlice[];
}

export interface CompletionDistributionPoint {
  range: string;
  studentCount: number;
}

export interface DayOfWeekActivityPoint {
  day: string;
  dayIndex: number;
  activeStudents: number;
  watchHours: number;
}

export interface EngagementTierPoint {
  tier: string;
  studentCount: number;
  minHours: number;
  maxHours: number;
}

export interface WeeklyRetentionPoint {
  weekLabel: string;
  weekStart: string;
  retainedStudents: number;
  previousActiveStudents: number;
  retentionRate: number;
}

export interface DetailedMetrics {
  completionDistribution: CompletionDistributionPoint[];
  dayOfWeekActivity: DayOfWeekActivityPoint[];
  engagementTiers: EngagementTierPoint[];
  weeklyRetention: WeeklyRetentionPoint[];
}

export interface LearningAnalyticsOverviewResult {
  totals: LearningAnalyticsTotals;
  collegeRows: LearningAnalyticsCollegeRow[];
  charts: LearningAnalyticsCharts;
  weeklyActiveTrend: WeeklyActiveTrendPoint[];
  alertSummary: PlatformAlertSummary;
  courseFunnel: ContentFunnelPoint[];
  detailedMetrics: DetailedMetrics;
}

export interface LearningAnalyticsCollegeInfo {
  id: string;
  name: string;
  slug: string | null;
}

export interface LearningAnalyticsCollegeTotals {
  totalStudents: number;
  activeLearningStudents: number;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  lastActivityAt: string | null;
}

export interface LearningAnalyticsStudentRow {
  studentId: string;
  userId: string | null;
  name: string;
  email: string;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  coursesStarted: number;
  coursesCompleted: number;
  lastActivityAt: string | null;
}

export interface LearningAnalyticsLeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  email: string;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  lastActivityAt: string | null;
}

export interface LearningAnalyticsModuleBreakdownRow {
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  totalVideos: number;
  watchedVideos: number;
  completedVideos: number;
  totalWatchSeconds: number;
  totalWatchHours: number;
  averageCompletionPercentage: number;
}

export interface LearningAnalyticsCollegeResult {
  college: LearningAnalyticsCollegeInfo | null;
  totals: LearningAnalyticsCollegeTotals;
  students: LearningAnalyticsStudentRow[];
  leaderboard: LearningAnalyticsLeaderboardRow[];
  charts: LearningAnalyticsCharts;
  moduleBreakdown: LearningAnalyticsModuleBreakdownRow[];
  weeklyActiveTrend: WeeklyActiveTrendPoint[];
  alertSummary: PlatformAlertSummary;
  courseFunnel: ContentFunnelPoint[];
  detailedMetrics: DetailedMetrics;
}

export interface LearningAnalyticsStudentInfo {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  collegeId: string;
  collegeName: string;
}

export interface LearningAnalyticsStudentTotals {
  totalWatchSeconds: number;
  totalWatchHours: number;
  uniqueWatchSeconds: number;
  uniqueWatchHours: number;
  repeatWatchSeconds: number | null;
  repeatWatchHours: number | null;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  lastActivityAt: string | null;
}

export interface LearningAnalyticsWatchedVideoRow {
  itemId: string;
  videoTitle: string;
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  totalSeconds: number;
  watchedSeconds: number;
  watchedHours: number;
  completionPercentage: number;
  completed: boolean;
  lastPositionSeconds: number | null;
  lastWatchedAt: string | null;
}

export interface LearningAnalyticsStudentResult {
  student: LearningAnalyticsStudentInfo | null;
  totals: LearningAnalyticsStudentTotals;
  charts: LearningAnalyticsCharts;
  moduleBreakdown: LearningAnalyticsModuleBreakdownRow[];
  watchedVideos: LearningAnalyticsWatchedVideoRow[];
  courseFunnel: ContentFunnelPoint[];
  detailedMetrics: DetailedMetrics;
}

/** Raw progress row from student_progress (read-only). */
export interface StudentProgressRecord {
  student_id: string;
  item_id: string;
  watched_seconds: number;
  unique_watched_seconds: number;
  total_seconds: number;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
  last_position_seconds: number;
}

/** Published video catalog item. */
export interface VideoCatalogItem {
  id: string;
  master_course_id: string;
  module_id: string;
  title: string;
  duration_seconds: number | null;
}

export interface VideoCatalogMeta {
  items: Map<string, VideoCatalogItem>;
  itemIds: Set<string>;
  totalAvailableVideos: number;
  itemsByCourse: Map<string, VideoCatalogItem[]>;
  itemsByModule: Map<string, VideoCatalogItem[]>;
}

export interface StudentRecord {
  id: string;
  user_id: string;
  college_id: string;
}

export interface CollegeRecord {
  id: string;
  name: string;
  slug: string;
}

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface CourseTitleRecord {
  id: string;
  title: string;
}

export interface ModuleTitleRecord {
  id: string;
  title: string;
  master_course_id: string;
}

/** Optional enhancement table (may be empty). */
export interface StudentVideoProgressRecord {
  student_id: string;
  lesson_id: string;
  unique_watched_seconds: number;
  repeat_watched_seconds: number;
  total_video_seconds_watched: number;
}

/** Free YouTube playlist analytics (enrollments + mark-as-done completions). */
export interface FreePlaylistEnrolledStudentRow {
  studentId: string;
  name: string;
  email: string;
  collegeName: string | null;
  enrolledAt: string;
  completedVideosCount: number;
  lastCompletionAt: string | null;
}

export interface FreePlaylistPlaylistRow {
  playlistId: string;
  playlistTitle: string;
  playlistThumbnailUrl: string | null;
  totalEnrollments: number;
  uniqueStudents: number;
  totalCompletions: number;
  completionsToday: number;
  lastEnrollmentAt: string | null;
  lastCompletionAt: string | null;
  enrolledStudents: FreePlaylistEnrolledStudentRow[];
}

export interface FreePlaylistDailyActivityRow {
  date: string;
  label: string;
  completionCount: number;
  uniqueStudents: number;
  activePlaylists: number;
}

export interface FreePlaylistTopActiveRow {
  playlistId: string;
  playlistTitle: string;
  completionCount: number;
  enrollmentCount: number;
}

export interface FreePlaylistFrequentWatcherRow {
  studentId: string;
  name: string;
  email: string;
  collegeName: string | null;
  activeDays: number;
}

export interface FreePlaylistAnalyticsOverview {
  available: boolean;
  loadError: string | null;
  totalEnrollments: number;
  totalUniqueStudents: number;
  totalCompletions: number;
  completionsToday: number;
  totalFrequentWatchers: number;
  enrollmentsByPlaylist: FreePlaylistPlaylistRow[];
  dailyCompletionTrend: FreePlaylistDailyActivityRow[];
  topActivePlaylists: FreePlaylistTopActiveRow[];
  frequentWatchers: FreePlaylistFrequentWatcherRow[];
}

export interface FreePlaylistDetailStudentRow {
  studentId: string;
  name: string;
  email: string;
  collegeName: string | null;
  enrolledAt: string;
  completedVideosCount: number;
  lastCompletionAt: string | null;
}

export interface FreePlaylistAnalyticsDetail {
  available: boolean;
  loadError: string | null;
  playlistId: string;
  playlistTitle: string;
  playlistThumbnailUrl: string | null;
  totalEnrollments: number;
  uniqueStudents: number;
  totalCompletions: number;
  completionsToday: number;
  enrolledStudents: FreePlaylistDetailStudentRow[];
}
