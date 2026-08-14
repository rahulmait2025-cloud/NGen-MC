-- Migration: 00254_lms_analytics_performance_optimization.sql
-- Description: Create composite indexes for progress/analytics tables and a unified get_student_analytics_payload RPC.

BEGIN;

-- 1. Create indexes to optimize analytics queries
CREATE INDEX IF NOT EXISTS idx_student_video_progress_student_completed_course
ON public.student_video_progress (student_id, completed, course_id);

CREATE INDEX IF NOT EXISTS idx_video_watch_sessions_student_started
ON public.video_watch_sessions (student_id, started_at, total_video_seconds_watched);

CREATE INDEX IF NOT EXISTS idx_video_watch_segments_student_created
ON public.video_watch_segments (student_id, created_at, start_second, end_second);


-- 2. Create the unified analytics payload function
CREATE OR REPLACE FUNCTION public.get_student_analytics_payload(
  p_student_id uuid,
  p_college_id uuid DEFAULT null,
  p_is_global boolean DEFAULT true,
  p_week_start date DEFAULT current_date,
  p_month_string text DEFAULT to_char(current_date, 'YYYY-MM')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_accessible_course_ids uuid[];
  v_valid_item_ids uuid[];
  v_month_start date;
  v_month_end date;
  v_total_days_in_month integer;
  v_num_weeks integer;
  v_overview jsonb;
  v_course_progress jsonb;
  v_learning_hours_trend jsonb;
  v_daily_analytics jsonb;
  v_weekly_analytics jsonb;
  v_pie_chart jsonb;
  v_available_courses jsonb;
  v_time_of_day jsonb;
  v_risk_profile jsonb;
  v_completion_counts jsonb;
  v_total_available_lectures integer := 0;
  v_lifetime_watch_sec numeric := 0;
  v_average_completion_percentage numeric := 0.0;
  v_started_courses integer := 0;
  v_completed_courses integer := 0;
  v_not_started_courses integer := 0;
BEGIN
  -- A. Resolve accessible courses
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_accessible_course_ids
  FROM public.get_student_entitled_courses(p_student_id, p_college_id, p_is_global, false);

  -- B. Resolve published video item IDs from those courses
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_valid_item_ids
  FROM public.master_course_items
  WHERE master_course_id = ANY(v_accessible_course_ids)
    AND publish_status = 'published'
    AND item_type = 'video';

  v_total_available_lectures := cardinality(v_valid_item_ids);

  -- C. Calculate lifetime watch seconds (across all video progress)
  SELECT coalesce(sum(total_video_seconds_watched), 0) INTO v_lifetime_watch_sec
  FROM public.student_video_progress
  WHERE student_id = p_student_id;

  -- D. Course level statistics calculation
  IF cardinality(v_accessible_course_ids) > 0 THEN
    WITH course_stats AS (
      SELECT
        mc.id AS course_id,
        count(ci.id) AS total_items,
        count(CASE WHEN vp.completed = true THEN 1 END) AS completed_items,
        count(CASE WHEN vp.unique_watched_seconds > 0 THEN 1 END) AS started_items
      FROM public.master_courses mc
      LEFT JOIN public.master_course_items ci ON ci.master_course_id = mc.id AND ci.publish_status = 'published'
      LEFT JOIN public.student_video_progress vp ON vp.lesson_id = ci.id AND vp.student_id = p_student_id
      WHERE mc.id = ANY(v_accessible_course_ids)
      GROUP BY mc.id
    )
    SELECT
      count(CASE WHEN total_items > 0 AND completed_items >= total_items THEN 1 END),
      count(CASE WHEN total_items > 0 AND completed_items < total_items AND started_items > 0 THEN 1 END),
      count(CASE WHEN total_items = 0 OR (completed_items = 0 AND started_items = 0) THEN 1 END)
    INTO v_completed_courses, v_started_courses, v_not_started_courses
    FROM course_stats;
  END IF;

  -- E. Calculate average completion percentage of all available video items
  IF v_total_available_lectures > 0 THEN
    SELECT coalesce(
      round(
        sum(
          CASE 
            WHEN video_duration_seconds > 0 THEN least(100, round((unique_watched_seconds::numeric / video_duration_seconds::numeric) * 100))
            ELSE 0
          END
        ) / v_total_available_lectures::numeric,
        1
      ),
      0.0
    ) INTO v_average_completion_percentage
    FROM public.student_video_progress
    WHERE student_id = p_student_id AND lesson_id = ANY(v_valid_item_ids);
  END IF;

  -- F. Create KPI Overview
  v_overview := jsonb_build_object(
    'totalHoursWatched', round(v_lifetime_watch_sec / 3600.0, 4),
    'totalWatchSeconds', round(v_lifetime_watch_sec, 2),
    'totalLecturesWatched', (SELECT count(1) FROM public.student_video_progress WHERE student_id = p_student_id AND unique_watched_seconds > 0 AND lesson_id = ANY(v_valid_item_ids)),
    'totalAvailableLectures', v_total_available_lectures,
    'totalAvailableCourses', cardinality(v_accessible_course_ids),
    'startedCourses', v_started_courses,
    'completedCourses', v_completed_courses,
    'notStartedCourses', v_not_started_courses,
    'averageCompletionPercentage', v_average_completion_percentage
  );

  -- G. Course Progress Summaries
  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_course_progress
  FROM (
    SELECT
      p_student_id AS student_id,
      mc.id AS master_course_id,
      mc.title AS course_title,
      count(distinct ci.id) AS total_items,
      count(distinct CASE WHEN vp.completed = true THEN ci.id END) AS completed_items,
      coalesce(round(sum(vs.total_video_seconds_watched) / 3600.0, 1), 0.0) AS hours_invested
    FROM public.master_courses mc
    JOIN public.master_course_items ci ON ci.master_course_id = mc.id
    LEFT JOIN public.student_video_progress vp ON vp.lesson_id = ci.id AND vp.student_id = p_student_id
    LEFT JOIN public.video_watch_sessions vs ON vs.course_id = mc.id AND vs.student_id = p_student_id
    WHERE mc.id = ANY(v_accessible_course_ids)
      AND ci.publish_status = 'published'
    GROUP BY mc.id, mc.title
    ORDER BY mc.title ASC
  ) t;

  -- H. Learning Hours Trend (Last 30 Days)
  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_learning_hours_trend
  FROM (
    SELECT
      to_char(started_at::date, 'YYYY-MM-DD') AS report_date,
      coalesce(round(sum(total_video_seconds_watched) / 3600.0, 3), 0.0) AS hours_logged
    FROM public.video_watch_sessions
    WHERE student_id = p_student_id
      AND started_at >= (current_date - interval '30 days')
    GROUP BY started_at::date
    ORDER BY started_at::date ASC
  ) t;

  -- I. Daily Analytics (Current Week)
  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_daily_analytics
  FROM (
    SELECT
      to_char(d.date_val::date, 'YYYY-MM-DD') AS date,
      coalesce(round((
        -- Segments duration sum
        coalesce((
          SELECT sum(greatest(0, end_second - start_second))
          FROM public.video_watch_segments seg
          WHERE seg.student_id = p_student_id
            AND seg.created_at >= d.date_val::date
            AND seg.created_at < (d.date_val::date + interval '1 day')
            AND seg.lesson_id = ANY(v_valid_item_ids)
        ), 0) +
        -- Non-segment session duration sum
        coalesce((
          SELECT sum(sess.total_video_seconds_watched)
          FROM public.video_watch_sessions sess
          WHERE sess.student_id = p_student_id
            AND sess.created_at >= d.date_val::date
            AND sess.created_at < (d.date_val::date + interval '1 day')
            AND sess.lesson_id = ANY(v_valid_item_ids)
            AND sess.id NOT IN (
              SELECT distinct session_id
              FROM public.video_watch_segments
              WHERE student_id = p_student_id AND session_id IS NOT NULL
            )
        ), 0)
      ) / 3600.0, 2), 0.0) AS "watchedHours",
      -- Lectures watched count
      (
        SELECT count(distinct lesson_id)
        FROM (
          SELECT lesson_id FROM public.video_watch_segments
          WHERE student_id = p_student_id AND created_at >= d.date_val::date AND created_at < (d.date_val::date + interval '1 day') AND lesson_id = ANY(v_valid_item_ids)
          UNION
          SELECT lesson_id FROM public.video_watch_sessions
          WHERE student_id = p_student_id AND created_at >= d.date_val::date AND created_at < (d.date_val::date + interval '1 day') AND lesson_id = ANY(v_valid_item_ids)
            AND total_video_seconds_watched > 0
          UNION
          SELECT lesson_id FROM public.student_video_progress
          WHERE student_id = p_student_id AND last_watched_at >= d.date_val::date AND last_watched_at < (d.date_val::date + interval '1 day') AND lesson_id = ANY(v_valid_item_ids)
            AND unique_watched_seconds > 0
        ) u
      )::integer AS "lecturesWatched",
      -- Lectures completed count
      (
        SELECT count(distinct lesson_id)
        FROM public.student_video_progress
        WHERE student_id = p_student_id
          AND completed = true
          AND last_watched_at >= d.date_val::date
          AND last_watched_at < (d.date_val::date + interval '1 day')
          AND lesson_id = ANY(v_valid_item_ids)
      )::integer AS "completedLectures"
    FROM generate_series(p_week_start::timestamp, p_week_start::timestamp + interval '6 days', interval '1 day') d(date_val)
    ORDER BY d.date_val ASC
  ) t;

  -- J. Weekly Analytics (Current Month)
  v_month_start := (p_month_string || '-01')::date;
  v_month_end := (v_month_start + interval '1 month')::date;
  v_total_days_in_month := v_month_end - v_month_start;
  v_num_weeks := ceil(v_total_days_in_month::numeric / 7.0)::integer;

  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_weekly_analytics
  FROM (
    SELECT
      to_char(w.w_start, 'YYYY-MM-DD') AS "weekStart",
      to_char((w.w_end - interval '1 second')::date, 'YYYY-MM-DD') AS "weekEnd",
      coalesce(round((
        coalesce((
          SELECT sum(greatest(0, end_second - start_second))
          FROM public.video_watch_segments seg
          WHERE seg.student_id = p_student_id
            AND seg.created_at >= w.w_start
            AND seg.created_at < w.w_end
            AND seg.lesson_id = ANY(v_valid_item_ids)
        ), 0) +
        coalesce((
          SELECT sum(sess.total_video_seconds_watched)
          FROM public.video_watch_sessions sess
          WHERE sess.student_id = p_student_id
            AND sess.created_at >= w.w_start
            AND sess.created_at < w.w_end
            AND sess.lesson_id = ANY(v_valid_item_ids)
            AND sess.id NOT IN (
              SELECT distinct session_id
              FROM public.video_watch_segments
              WHERE student_id = p_student_id AND session_id IS NOT NULL
            )
        ), 0)
      ) / 3600.0, 2), 0.0) AS "watchedHours",
      (
        SELECT count(distinct lesson_id)
        FROM (
          SELECT lesson_id FROM public.video_watch_segments
          WHERE student_id = p_student_id AND created_at >= w.w_start AND created_at < w.w_end AND lesson_id = ANY(v_valid_item_ids)
          UNION
          SELECT lesson_id FROM public.video_watch_sessions
          WHERE student_id = p_student_id AND created_at >= w.w_start AND created_at < w.w_end AND lesson_id = ANY(v_valid_item_ids)
            AND total_video_seconds_watched > 0
        ) u
      )::integer AS "lecturesWatched",
      (
        SELECT count(distinct lesson_id)
        FROM public.student_video_progress
        WHERE student_id = p_student_id
          AND completed = true
          AND last_watched_at >= w.w_start
          AND last_watched_at < w.w_end
          AND lesson_id = ANY(v_valid_item_ids)
      )::integer AS "completedLectures"
    FROM (
      SELECT
        (v_month_start + (idx * 7) * interval '1 day')::date AS w_start,
        least(v_month_end, (v_month_start + ((idx + 1) * 7) * interval '1 day'))::date AS w_end
      FROM generate_series(0, v_num_weeks - 1) idx
    ) w
    ORDER BY w.w_start ASC
  ) t;

  -- K. Completion Counts By Type
  SELECT jsonb_build_object(
    'videosCompleted', count(CASE WHEN ci.item_type = 'video' THEN 1 END),
    'assignmentsCompleted', count(CASE WHEN ci.item_type = 'assignment_placeholder' THEN 1 END),
    'quizzesCompleted', count(CASE WHEN ci.item_type = 'quiz_placeholder' THEN 1 END)
  ) INTO v_completion_counts
  FROM public.student_video_progress vp
  JOIN public.master_course_items ci ON ci.id = vp.lesson_id
  WHERE vp.student_id = p_student_id AND vp.completed = true;

  -- L. Risk Profile
  SELECT jsonb_build_object(
    'risk_status', CASE
      WHEN max(started_at) IS NULL OR max(started_at) < now() - interval '14 days' THEN 'Inactive (14d+)'
      ELSE 'On Track'
    END,
    'is_at_risk', CASE
      WHEN max(started_at) IS NULL OR max(started_at) < now() - interval '14 days' THEN true
      ELSE false
    END
  ) INTO v_risk_profile
  FROM public.video_watch_sessions
  WHERE student_id = p_student_id;

  -- M. Pie Chart
  v_pie_chart := jsonb_build_object(
    'totalAvailableCourses', cardinality(v_accessible_course_ids),
    'notStartedCourses', v_not_started_courses,
    'startedCourses', v_started_courses,
    'completedCourses', v_completed_courses
  );

  -- N. Available Courses list
  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_available_courses
  FROM (
    SELECT id, title
    FROM public.master_courses
    WHERE id = ANY(v_accessible_course_ids)
    ORDER BY title ASC
  ) t;

  -- O. Time of Day Heatmap (Last 90 days)
  WITH tod_sessions AS (
    SELECT
      created_at,
      coalesce(total_video_seconds_watched, 0) AS watched_sec
    FROM public.video_watch_sessions
    WHERE student_id = p_student_id
      AND created_at >= (now() - interval '90 days')
      AND total_video_seconds_watched > 0
  ),
  hourly_buckets AS (
    SELECT
      h AS hour_val,
      coalesce(sum(watched_sec), 0) AS seconds_val
    FROM generate_series(0, 23) h
    LEFT JOIN tod_sessions ON extract(hour from timezone('UTC', created_at)) = h
    GROUP BY h
  ),
  daily_buckets AS (
    SELECT
      d AS day_index,
      coalesce(sum(watched_sec), 0) AS seconds_val
    FROM generate_series(0, 6) d
    LEFT JOIN tod_sessions ON extract(dow from timezone('UTC', created_at)) = d
    GROUP BY d
  )
  SELECT jsonb_build_object(
    'hourly', (
      SELECT jsonb_agg(jsonb_build_object(
        'hour', hour_val,
        'label', to_char(hour_val * interval '1 hour', 'HH24:MI'),
        'seconds', seconds_val,
        'hours', round(seconds_val / 3600.0, 2)
      ))
      FROM (SELECT hour_val, seconds_val FROM hourly_buckets ORDER BY hour_val ASC) hb
    ),
    'dailyBreakdown', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', CASE day_index
          WHEN 0 THEN 'Sun'
          WHEN 1 THEN 'Mon'
          WHEN 2 THEN 'Tue'
          WHEN 3 THEN 'Wed'
          WHEN 4 THEN 'Thu'
          WHEN 5 THEN 'Fri'
          WHEN 6 THEN 'Sat'
        END,
        'dayIndex', day_index,
        'seconds', seconds_val,
        'hours', round(seconds_val / 3600.0, 2)
      ))
      FROM (SELECT day_index, seconds_val FROM daily_buckets ORDER BY day_index ASC) db
    ),
    'totalSeconds', coalesce((SELECT sum(watched_sec) FROM tod_sessions), 0),
    'totalHours', round(coalesce((SELECT sum(watched_sec) FROM tod_sessions), 0) / 3600.0, 1),
    'peakHour', (
      SELECT jsonb_build_object(
        'hour', hour_val,
        'label', to_char(hour_val * interval '1 hour', 'HH24:MI'),
        'hours', round(seconds_val / 3600.0, 2)
      )
      FROM hourly_buckets ORDER BY seconds_val DESC, hour_val ASC LIMIT 1
    ),
    'peakDay', (
      SELECT jsonb_build_object(
        'day', CASE day_index
          WHEN 0 THEN 'Sun'
          WHEN 1 THEN 'Mon'
          WHEN 2 THEN 'Tue'
          WHEN 3 THEN 'Wed'
          WHEN 4 THEN 'Thu'
          WHEN 5 THEN 'Fri'
          WHEN 6 THEN 'Sat'
        END,
        'hours', round(seconds_val / 3600.0, 2)
      )
      FROM daily_buckets ORDER BY seconds_val DESC, day_index ASC LIMIT 1
    ),
    'periods', (
      SELECT jsonb_agg(jsonb_build_object(
        'name', name,
        'range', range_str,
        'seconds', sec_val,
        'hours', round(sec_val / 3600.0, 1)
      ))
      FROM (
        SELECT 'Morning' AS name, '5 AM – 12 PM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val BETWEEN 5 AND 11
        UNION ALL
        SELECT 'Afternoon' AS name, '12 PM – 5 PM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val BETWEEN 12 AND 16
        UNION ALL
        SELECT 'Evening' AS name, '5 PM – 9 PM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val BETWEEN 17 AND 20
        UNION ALL
        SELECT 'Night' AS name, '9 PM – 5 AM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val >= 21 OR hour_val < 5
      ) p
    ),
    'dominantPeriod', (
      SELECT jsonb_build_object(
        'name', name,
        'range', range_str,
        'hours', round(sec_val / 3600.0, 1)
      )
      FROM (
        SELECT 'Morning' AS name, '5 AM – 12 PM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val BETWEEN 5 AND 11
        UNION ALL
        SELECT 'Afternoon' AS name, '12 PM – 5 PM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val BETWEEN 12 AND 16
        UNION ALL
        SELECT 'Evening' AS name, '5 PM – 9 PM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val BETWEEN 17 AND 20
        UNION ALL
        SELECT 'Night' AS name, '9 PM – 5 AM' AS range_str, coalesce(sum(seconds_val), 0) AS sec_val FROM hourly_buckets WHERE hour_val >= 21 OR hour_val < 5
      ) dp ORDER BY sec_val DESC LIMIT 1
    )
  ) INTO v_time_of_day;

  RETURN jsonb_build_object(
    'overview', v_overview,
    'course_progress', v_course_progress,
    'learning_hours_trend', v_learning_hours_trend,
    'daily_analytics', v_daily_analytics,
    'weekly_analytics', v_weekly_analytics,
    'pie_chart', v_pie_chart,
    'available_courses', v_available_courses,
    'time_of_day', v_time_of_day,
    'risk_profile', v_risk_profile,
    'completion_counts', v_completion_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) TO authenticated, postgres, service_role;

COMMIT;
