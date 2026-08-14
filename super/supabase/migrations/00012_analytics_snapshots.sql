-- Migration 00012: Per-College Analytics Snapshots & Comparison Query Layer
-- Enables tracking historical KPI trends and supporting "at risk" analysis dashboards

-------------------------------------------------------------------------------
-- 1. SNAPSHOTS STORAGE TABLE
-------------------------------------------------------------------------------
create table if not exists public.college_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.colleges(id) on delete cascade,
  snapshot_date date not null default current_date,
  
  -- Copied from mv_college_kpis
  total_students integer not null default 0,
  active_students integer not null default 0,
  lectures_completed integer not null default 0,
  lecture_completion_rate numeric(5,2) not null default 0,
  attendance_rate numeric(5,2) not null default 0,
  assessment_completion_rate numeric(5,2) not null default 0,
  avg_assessment_score numeric(5,2) not null default 0,
  placement_ready_count integer not null default 0,
  placed_count integer not null default 0,
  resume_completion_rate numeric(5,2) not null default 0,
  linkedin_completion_rate numeric(5,2) not null default 0,
  github_completion_rate numeric(5,2) not null default 0,
  engagement_score numeric(5,2) not null default 0,

  created_at timestamptz not null default now(),
  
  -- Ensure only one snapshot per college per day
  unique(tenant_id, snapshot_date)
);

create index if not exists idx_college_snapshots_tenant_date on public.college_analytics_snapshots(tenant_id, snapshot_date);
create index if not exists idx_college_snapshots_date on public.college_analytics_snapshots(snapshot_date);

alter table public.college_analytics_snapshots enable row level security;

-- Only authenticated users (admins/superadmins) should read snapshots.
drop policy if exists "Allow read access for authenticated users" on public.college_analytics_snapshots;
create policy "Allow read access for authenticated users" on public.college_analytics_snapshots
  for select using (auth.role() = 'authenticated');

-------------------------------------------------------------------------------
-- 2. DAILY AUTOMATION JOB
-------------------------------------------------------------------------------
create or replace function public.generate_daily_college_snapshots()
returns void as $$
begin
  insert into public.college_analytics_snapshots (
    tenant_id,
    snapshot_date,
    total_students,
    active_students,
    lectures_completed,
    lecture_completion_rate,
    attendance_rate,
    assessment_completion_rate,
    avg_assessment_score,
    placement_ready_count,
    placed_count,
    resume_completion_rate,
    linkedin_completion_rate,
    github_completion_rate,
    engagement_score
  )
  select
    college_id,
    current_date,
    total_students,
    active_students,
    total_lectures_completed,
    lecture_completion_rate,
    attendance_rate,
    assessment_completion_rate,
    average_assessment_score,
    placement_ready_count,
    placed_count,
    resume_completion_rate,
    linkedin_completion_rate,
    github_completion_rate,
    engagement_score
  from public.mv_college_kpis
  on conflict (tenant_id, snapshot_date) do update set
    total_students = excluded.total_students,
    active_students = excluded.active_students,
    lectures_completed = excluded.lectures_completed,
    lecture_completion_rate = excluded.lecture_completion_rate,
    attendance_rate = excluded.attendance_rate,
    assessment_completion_rate = excluded.assessment_completion_rate,
    avg_assessment_score = excluded.avg_assessment_score,
    placement_ready_count = excluded.placement_ready_count,
    placed_count = excluded.placed_count,
    resume_completion_rate = excluded.resume_completion_rate,
    linkedin_completion_rate = excluded.linkedin_completion_rate,
    github_completion_rate = excluded.github_completion_rate,
    engagement_score = excluded.engagement_score;
end;
$$ language plpgsql security definer;

-- Schedule the snapshot job to run daily at Midnight UTC (only if pg_cron is available)
do $$
begin
  perform cron.schedule('generate_daily_college_snapshots', '0 0 * * *', 'select public.generate_daily_college_snapshots()');
exception
  when others then null; -- cron schema/extension not available (e.g. 3F000 undefined_schema)
end $$;

-------------------------------------------------------------------------------
-- 3. COMPARISON & TREND RPCs (Functions)
-------------------------------------------------------------------------------

-- 3A. func_get_college_trends
-- Returns a timeline of engagement scores and attendance over N days
create or replace function public.func_get_college_trends(
  p_tenant_id uuid,
  p_interval_days integer default 30
)
returns table (
  snapshot_date date,
  engagement_score numeric(5,2),
  attendance_rate numeric(5,2),
  avg_assessment_score numeric(5,2),
  active_students int
) as $$
begin
  return query
  select 
    s.snapshot_date,
    s.engagement_score,
    s.attendance_rate,
    s.avg_assessment_score,
    s.active_students
  from public.college_analytics_snapshots s
  where s.tenant_id = p_tenant_id
  and s.snapshot_date >= (current_date - p_interval_days)
  order by s.snapshot_date asc;
end;
$$ language plpgsql security definer;

-- 3B. vw_college_rankings moved to 00023_materialized_kpi_views.sql (depends on mv_college_kpis)

-- 3C. func_get_at_risk_colleges
-- Identifies colleges whose recent snapshot's engagement drop significantly OR is chronically low.
-- Criteria: Engagement < 40 OR (compared to 30 days ago, engagement dropped > 15 absolute points)
create or replace function public.func_get_at_risk_colleges()
returns table (
  tenant_id uuid,
  college_name text,
  current_engagement_score numeric(5,2),
  past_engagement_score numeric(5,2),
  risk_reason text
) as $$
begin
  return query
  with current_snap as (
    select
      s.tenant_id,
      s.engagement_score
    from public.college_analytics_snapshots s
    where s.snapshot_date = current_date
  ),
  past_snap as (
    -- Get snapshot ~30 days ago (or closest available oldest snap up to 30 days)
    select distinct on (s.tenant_id)
      s.tenant_id,
      s.engagement_score
    from public.college_analytics_snapshots s
    where s.snapshot_date <= (current_date - 30)
    order by s.tenant_id, s.snapshot_date desc
  )
  select
    c.id,
    c.name,
    cs.engagement_score as current_engagement_score,
    ps.engagement_score as past_engagement_score,
    case
      when cs.engagement_score < 40.0 then 'Chronically low engagement (< 40)'
      when ps.engagement_score is not null and (ps.engagement_score - cs.engagement_score) > 15.0 then 'Significant engagement drop (> 15 pts)'
      else 'Unknown'
    end as risk_reason
  from public.colleges c
  join current_snap cs on cs.tenant_id = c.id
  left join past_snap ps on ps.tenant_id = c.id
  where c.status = 'active'
    and (cs.engagement_score < 40.0 or (ps.engagement_score is not null and (ps.engagement_score - cs.engagement_score) > 15.0));
end;
$$ language plpgsql security definer;

-- 3D. func_compare_periods
-- Generates a single-row delta output comparing current period (days) vs previous period.
create or replace function public.func_compare_periods(
  p_tenant_id uuid,
  p_period_start date,
  p_period_end date,
  p_prev_start date,
  p_prev_end date
)
returns table (
  metric text,
  current_val numeric,
  prev_val numeric,
  delta numeric
) as $$
begin
  -- Comparing average engagement score across two date ranges
  return query
  with current_period as (
    select avg(engagement_score) as avg_eng from public.college_analytics_snapshots
    where tenant_id = p_tenant_id and snapshot_date between p_period_start and p_period_end
  ),
  prev_period as (
    select avg(engagement_score) as avg_eng from public.college_analytics_snapshots
    where tenant_id = p_tenant_id and snapshot_date between p_prev_start and p_prev_end
  )
  select
    'Average Engagement'::text as metric,
    coalesce(cp.avg_eng, 0)::numeric as current_val,
    coalesce(pp.avg_eng, 0)::numeric as prev_val,
    coalesce(cp.avg_eng, 0)::numeric - coalesce(pp.avg_eng, 0)::numeric as delta
  from current_period cp, prev_period pp;
end;
$$ language plpgsql security definer;
