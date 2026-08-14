-- Placements dashboard views: readiness funnel, counts, company pipeline, mock outcomes, offer stats

-- Allow upsert on linkedin/github reviews (one per student per college)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'linkedin_reviews_student_college_unique') then
    alter table public.linkedin_reviews add constraint linkedin_reviews_student_college_unique unique (student_id, college_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'github_reviews_student_college_unique') then
    alter table public.github_reviews add constraint github_reviews_student_college_unique unique (student_id, college_id);
  end if;
end $$;

-- Readiness funnel counts per college
create or replace view public.v_placement_readiness_funnel as
select
  college_id,
  count(*) filter (where status = 'not_ready') as not_ready_count,
  count(*) filter (where status = 'needs_improvement') as needs_improvement_count,
  count(*) filter (where status = 'interview_ready') as interview_ready_count,
  count(*) filter (where status = 'placed') as placed_count,
  count(*) as total_profiles
from public.placement_profiles
group by college_id;

-- Pending reviews (resume, linkedin, github) per college
create or replace view public.v_placement_pending_reviews as
select
  pp.college_id,
  pp.id as profile_id,
  pp.student_id,
  (select count(*) from public.resume_versions rv where rv.placement_profile_id = pp.id and rv.status = 'pending') as pending_resume,
  (select count(*) from public.linkedin_reviews lr where lr.student_id = pp.student_id and lr.college_id = pp.college_id and lr.status = 'pending') as pending_linkedin,
  (select count(*) from public.github_reviews gr where gr.student_id = pp.student_id and gr.college_id = pp.college_id and gr.status = 'pending') as pending_github
from public.placement_profiles pp;

-- Company-wise pipeline (applications per company per college)
create or replace view public.v_placement_company_pipeline as
select
  college_id,
  company_name,
  count(*) as application_count,
  count(*) filter (where status = 'applied') as applied_count,
  count(*) filter (where status = 'shortlisted') as shortlisted_count,
  count(*) filter (where status = 'interview') as interview_count,
  count(*) filter (where status = 'offer') as offer_count,
  count(*) filter (where status = 'rejected') as rejected_count
from public.student_applications
group by college_id, company_name;

-- Mock interview outcomes per college
create or replace view public.v_placement_mock_interview_outcomes as
select
  college_id,
  outcome,
  count(*) as cnt
from public.mock_interviews
where outcome is not null
group by college_id, outcome;

-- Offer stats per college
create or replace view public.v_placement_offer_stats as
select
  college_id,
  count(*) as total_offers,
  count(*) filter (where status = 'accepted') as accepted_count,
  count(*) filter (where verified_at is not null) as verified_count
from public.offers
group by college_id;

grant select on public.v_placement_readiness_funnel to authenticated;
grant select on public.v_placement_pending_reviews to authenticated;
grant select on public.v_placement_company_pipeline to authenticated;
grant select on public.v_placement_mock_interview_outcomes to authenticated;
grant select on public.v_placement_offer_stats to authenticated;
