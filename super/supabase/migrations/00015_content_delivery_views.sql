-- Content delivery dashboard views: completion rate, engagement, drop-off, inactive students

-- Total lectures per course (published only)
create or replace view public.v_course_lecture_counts as
select
  c.id as course_id,
  c.college_id,
  c.title as course_title,
  count(l.id) as total_lectures
from public.courses c
join public.course_modules cm on cm.course_id = c.id
join public.lectures l on l.course_module_id = cm.id and l.status = 'published'
where c.status = 'published'
group by c.id, c.college_id, c.title;

-- Course completion: % of enrolled students who completed all lectures
create or replace view public.v_course_completion_rate as
select
  ce.course_id,
  c.college_id,
  c.title as course_title,
  count(distinct ce.student_id) as enrolled_count,
  count(distinct case
    when coalesce(agg.completed_lectures, 0) >= coalesce(lc.total_lectures, 0) and coalesce(lc.total_lectures, 0) > 0
    then ce.student_id
  end) as completed_count,
  case
    when count(distinct ce.student_id) = 0 then 0
    else round(
      100.0 * count(distinct case
        when coalesce(agg.completed_lectures, 0) >= coalesce(lc.total_lectures, 0) and coalesce(lc.total_lectures, 0) > 0
        then ce.student_id
      end) / nullif(count(distinct ce.student_id), 0),
      2
    )
  end as completion_rate_pct
from public.course_enrollments ce
join public.courses c on c.id = ce.course_id
left join public.v_course_lecture_counts lc on lc.course_id = ce.course_id
left join (
  select enrollment_id, count(*) as completed_lectures
  from public.lecture_progress
  where completed_at is not null
  group by enrollment_id
) agg on agg.enrollment_id = ce.id
group by ce.course_id, c.college_id, c.title, lc.total_lectures;

-- Lecture-level completion (for drop-off and trend)
create or replace view public.v_lecture_completion_counts as
select
  l.id as lecture_id,
  l.course_module_id,
  l.title as lecture_title,
  l.sort_order as lecture_sort_order,
  cm.course_id,
  cm.title as module_title,
  cm.sort_order as module_sort_order,
  c.college_id,
  count(lp.id) filter (where lp.completed_at is not null) as completed_count,
  count(lp.id) as started_count
from public.lectures l
join public.course_modules cm on cm.id = l.course_module_id
join public.courses c on c.id = cm.course_id
left join public.lecture_progress lp on lp.lecture_id = l.id
group by l.id, l.course_module_id, l.title, l.sort_order, cm.course_id, cm.title, cm.sort_order, c.college_id;

-- Module completion rate (top-performing modules)
create or replace view public.v_module_completion_rate as
select
  cm.id as module_id,
  cm.course_id,
  cm.title as module_title,
  cm.sort_order,
  c.college_id,
  count(distinct ce.id) as enrollments_in_course,
  count(distinct case when mod_agg.completed_lectures = mod_agg.total_lectures and mod_agg.total_lectures > 0 then ce.id end) as completed_module_count,
  round(
    100.0 * count(distinct case when mod_agg.completed_lectures = mod_agg.total_lectures and mod_agg.total_lectures > 0 then ce.id end)
    / nullif(count(distinct ce.id), 0),
    2
  ) as completion_rate_pct
from public.course_modules cm
join public.courses c on c.id = cm.course_id
left join public.course_enrollments ce on ce.course_id = cm.course_id
left join (
  select
    lp.enrollment_id,
    l.course_module_id,
    count(distinct l.id) as total_lectures,
    count(distinct case when lp.completed_at is not null then l.id end) as completed_lectures
  from public.lecture_progress lp
  join public.lectures l on l.id = lp.lecture_id
  group by lp.enrollment_id, l.course_module_id
) mod_agg on mod_agg.enrollment_id = ce.id and mod_agg.course_module_id = cm.id
group by cm.id, cm.course_id, cm.title, cm.sort_order, c.college_id;

-- Simpler: drop-off points (lectures with lowest completion rate per course)
create or replace view public.v_lecture_drop_off as
select
  lcc.lecture_id,
  lcc.course_id,
  lcc.college_id,
  lcc.lecture_title,
  lcc.module_title,
  lcc.lecture_sort_order,
  lcc.module_sort_order,
  lcc.completed_count,
  lcc.started_count,
  lc.total_lectures as course_total_lectures,
  case
    when ce_cnt.enrolled_count = 0 then 0
    else round(100.0 * lcc.completed_count / nullif(ce_cnt.enrolled_count, 0), 2)
  end as completion_pct
from public.v_lecture_completion_counts lcc
left join public.v_course_lecture_counts lc on lc.course_id = lcc.course_id
left join (select course_id, count(*) as enrolled_count from public.course_enrollments group by course_id) ce_cnt on ce_cnt.course_id = lcc.course_id;

-- Inactive students by course (enrolled but no progress in last 14 days)
create or replace view public.v_inactive_students_by_course as
select
  ce.course_id,
  ce.student_id,
  c.college_id,
  c.title as course_title,
  ce.enrolled_at,
  max(lp.updated_at) as last_activity_at,
  (current_date - (coalesce(max(lp.updated_at), ce.enrolled_at))::date) as days_inactive
from public.course_enrollments ce
join public.courses c on c.id = ce.course_id
left join public.lecture_progress lp on lp.enrollment_id = ce.id
group by ce.id, ce.course_id, ce.student_id, ce.enrolled_at, c.college_id, c.title
having (max(lp.updated_at) is null and (current_date - ce.enrolled_at::date) >= 14)
    or (max(lp.updated_at) is not null and (current_date - max(lp.updated_at)::date) >= 14);

-- RLS: use underlying table policies; views run as owner. Grant select to authenticated.
grant select on public.v_course_lecture_counts to authenticated;
grant select on public.v_course_completion_rate to authenticated;
grant select on public.v_lecture_completion_counts to authenticated;
grant select on public.v_module_completion_rate to authenticated;
grant select on public.v_lecture_drop_off to authenticated;
grant select on public.v_inactive_students_by_course to authenticated;
