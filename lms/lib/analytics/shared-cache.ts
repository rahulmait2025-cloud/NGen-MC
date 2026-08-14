import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  CoursePieChartData,
  DailyAnalyticsRow,
  StudentAnalyticsOverview,
  TimeOfDayAnalytics,
  WeeklyAnalyticsRow,
} from './student-video-analytics-service';

export interface StudentAnalyticsRpcPayload {
  overview: StudentAnalyticsOverview;
  daily_analytics: DailyAnalyticsRow[];
  weekly_analytics: WeeklyAnalyticsRow[];
  pie_chart: CoursePieChartData;
  available_courses: { id: string; title: string }[];
  time_of_day: TimeOfDayAnalytics;
  course_progress: Array<{
    student_id: string;
    master_course_id: string;
    course_title: string;
    total_items: number;
    completed_items: number;
    hours_invested: number;
  }>;
  learning_hours_trend: Array<{
    report_date: string;
    hours_logged: number;
  }>;
  risk_profile: {
    risk_status: string;
    is_at_risk: boolean;
  };
  completion_counts: {
    videosCompleted: number;
    assignmentsCompleted: number;
    quizzesCompleted: number;
  };
}

export function getWeekStartString(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

export const getSharedAnalyticsPayload = cache(async (
  studentId: string,
  collegeId: string | null,
  isGlobal: boolean,
  weekStart: string,
  monthString: string
) => {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc('get_student_analytics_payload', {
    p_student_id: studentId,
    p_college_id: collegeId,
    p_is_global: isGlobal,
    p_week_start: weekStart,
    p_month_string: monthString
  });
  if (error) {
    console.error('[getSharedAnalyticsPayload] rpc error:', error);
    throw error;
  }
  return data as StudentAnalyticsRpcPayload;
});
