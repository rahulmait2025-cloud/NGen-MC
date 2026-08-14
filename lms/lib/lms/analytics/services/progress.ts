import { createAdminClient } from '@/lib/supabase/admin'
import { getSharedAnalyticsPayload, getWeekStartString } from '@/lib/analytics/shared-cache'

interface RawVideoProgressRow {
  id: string
  completed: boolean
  unique_watched_seconds: number
  video_duration_seconds: number
  last_watched_at: string
  lesson_id: string
  course_id: string
  completion_percentage: number
  last_position_seconds: number
  max_position_seconds: number
  total_video_seconds_watched: number
}

export class StudentProgressService {
  static async getOverview(studentId: string) {
    const supabase = await createAdminClient()
    const { data: progressData, error } = await supabase
      .from('student_video_progress')
      .select('id, completed, unique_watched_seconds, video_duration_seconds, last_watched_at, lesson_id')
      .eq('student_id', studentId)
    if (error) throw error
    let completedLessons = 0
    let totalWatchSeconds = 0
    let mostRecentActivity: RawVideoProgressRow | null = null
    let latestUpdate = 0
    for (const row of progressData as RawVideoProgressRow[]) {
      if (row.completed) completedLessons++
      totalWatchSeconds += row.unique_watched_seconds
      const rowTime = new Date(row.last_watched_at).getTime()
      if (rowTime > latestUpdate) {
        latestUpdate = rowTime
        mostRecentActivity = row
      }
    }
    const result = {
      completedLessons,
      totalWatchSeconds,
      recentActivity: mostRecentActivity,
    }
    return result
  }

  static async getCourseCompletionSummaries(studentId: string): Promise<Array<{
    student_id: string;
    master_course_id: string;
    course_title: string;
    total_items: number;
    completed_items: number;
    hours_invested: number;
  }>> {
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      null,
      true,
      weekStart,
      currentMonth
    );
    return payload.course_progress;
  }

  static async getLearningHoursTrend(studentId: string): Promise<Array<{
    report_date: string;
    hours_logged: number;
  }>> {
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      null,
      true,
      weekStart,
      currentMonth
    );
    return payload.learning_hours_trend;
  }

  static async getStudentRiskProfile(studentId: string): Promise<{
    risk_status: string;
    is_at_risk: boolean;
  }> {
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      null,
      true,
      weekStart,
      currentMonth
    );
    return payload.risk_profile;
  }

  static async getContinueLearningTarget(studentId: string) {
    const supabase = await createAdminClient()

    // 1. Get the absolute most recently watched video progress row (completed or not)
    const { data: latestWatched, error: latestError } = await supabase
      .from('student_video_progress')
      .select('lesson_id, last_position_seconds, last_watched_at, completed, course_id')
      .eq('student_id', studentId)
      .order('last_watched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError && latestError.code !== 'PGRST116') throw latestError
    if (!latestWatched) return null

    // 2. If it is NOT completed, that's our target!
    if (!latestWatched.completed) {
      return {
        item_id: latestWatched.lesson_id,
        last_position_seconds: latestWatched.last_position_seconds,
        updated_at: latestWatched.last_watched_at,
      }
    }

    // 3. If it IS completed, find the next uncompleted lesson in the same course
    const { data: items, error: itemsError } = await supabase
      .from('master_course_items')
      .select('id, sort_order, created_at')
      .eq('master_course_id', latestWatched.course_id)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    if (items && items.length > 0) {
      // Find the index of the completed lesson
      const currentIndex = items.findIndex(item => item.id === latestWatched.lesson_id)
      
      if (currentIndex !== -1) {
        // Fetch progress for all items in this course to check completion status
        const { data: progressRows, error: progressError } = await supabase
          .from('student_video_progress')
          .select('lesson_id, completed, last_position_seconds, last_watched_at')
          .eq('student_id', studentId)
          .eq('course_id', latestWatched.course_id)

        if (progressError) throw progressError

        const progressMap = new Map(
          (progressRows ?? []).map(row => [row.lesson_id, row])
        )

        // Search for the first uncompleted lesson after the current one
        for (let i = currentIndex + 1; i < items.length; i++) {
          const item = items[i]
          const prog = progressMap.get(item.id)
          if (!prog || !prog.completed) {
            return {
              item_id: item.id,
              last_position_seconds: prog?.last_position_seconds ?? 0,
              updated_at: prog?.last_watched_at ?? latestWatched.last_watched_at,
            }
          }
        }
      }
    }

    // 4. Fallback: If the current course is fully completed or has no next lesson,
    // get the most recently watched uncompleted lesson from any course
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('student_video_progress')
      .select('lesson_id, last_position_seconds, last_watched_at')
      .eq('student_id', studentId)
      .eq('completed', false)
      .order('last_watched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fallbackError && fallbackError.code !== 'PGRST116') throw fallbackError
    if (fallbackData) {
      return {
        item_id: fallbackData.lesson_id,
        last_position_seconds: fallbackData.last_position_seconds,
        updated_at: fallbackData.last_watched_at,
      }
    }

    // If absolutely no uncompleted lessons exist, return the completed one so they can at least view/resume something
    return {
      item_id: latestWatched.lesson_id,
      last_position_seconds: latestWatched.last_position_seconds,
      updated_at: latestWatched.last_watched_at,
    }
  }

  static async getCompletionCountsByType(studentId: string): Promise<{
    videosCompleted: number;
    assignmentsCompleted: number;
    quizzesCompleted: number;
  }> {
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      null,
      true,
      weekStart,
      currentMonth
    );
    return payload.completion_counts;
  }

  static async getLearningStreak(studentId: string) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('video_watch_sessions')
      .select('started_at')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
    if (error) throw error
    if (!data || data.length === 0) return { activeDaysCount: 0, lastActiveDay: null }
    const uniqueDays = new Set<string>()
    for (const row of data) {
       uniqueDays.add(new Date(row.started_at).toISOString().split('T')[0])
    }
    const sortedDays = Array.from(uniqueDays).sort().reverse()
    return {
      activeDaysCount: uniqueDays.size,
      lastActiveDay: sortedDays.length > 0 ? sortedDays[0] : null
    }
  }
}
