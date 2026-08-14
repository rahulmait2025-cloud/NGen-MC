-- Placements workflow: placement profiles, reviews, applications, offers, documents, history
-- All tenant-scoped by college_id. RLS: students see own; admins/mentors see college.

-- Placement profile (one per student per college; extends student placement data)
create table if not exists public.placement_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  status text not null default 'not_ready' check (status in ('not_ready', 'needs_improvement', 'interview_ready', 'placed')),
  skills_json jsonb default '[]'::jsonb,
  projects_json jsonb default '[]'::jsonb,
  linkedin_url text,
  github_url text,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(student_id)
);

create index if not exists idx_placement_profiles_student on public.placement_profiles(student_id);
create index if not exists idx_placement_profiles_college_status on public.placement_profiles(college_id, status);

-- Resume versions (per profile; admin reviews)
create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  placement_profile_id uuid not null references public.placement_profiles(id) on delete cascade,
  file_url text not null,
  version_number integer not null default 1,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_resume_versions_profile on public.resume_versions(placement_profile_id);

-- LinkedIn reviews
create table if not exists public.linkedin_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_improvement')),
  feedback text,
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_linkedin_reviews_student on public.linkedin_reviews(student_id);
create index if not exists idx_linkedin_reviews_college on public.linkedin_reviews(college_id);

-- GitHub reviews
create table if not exists public.github_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_improvement')),
  feedback text,
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_github_reviews_student on public.github_reviews(student_id);
create index if not exists idx_github_reviews_college on public.github_reviews(college_id);

-- Overall placement readiness review (admin/mentor sets status + notes)
create table if not exists public.placement_readiness_reviews (
  id uuid primary key default gen_random_uuid(),
  placement_profile_id uuid not null references public.placement_profiles(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  overall_status text not null check (overall_status in ('not_ready', 'needs_improvement', 'interview_ready', 'placed')),
  feedback text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_placement_readiness_reviews_profile on public.placement_readiness_reviews(placement_profile_id);
create index if not exists idx_placement_readiness_reviews_college on public.placement_readiness_reviews(college_id);

-- Mock interviews
create table if not exists public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  scheduled_at timestamptz,
  conducted_at timestamptz,
  outcome text check (outcome in ('scheduled', 'completed', 'cancelled', 'no_show')),
  feedback text,
  interviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mock_interviews_student on public.mock_interviews(student_id);
create index if not exists idx_mock_interviews_college on public.mock_interviews(college_id);

-- Student applications (company, role, status)
create table if not exists public.student_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  company_name text not null,
  role text,
  status text not null default 'applied' check (status in ('draft', 'applied', 'shortlisted', 'interview', 'offer', 'rejected', 'withdrawn')),
  applied_at date,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_applications_student on public.student_applications(student_id);
create index if not exists idx_student_applications_college on public.student_applications(college_id);
create index if not exists idx_student_applications_company on public.student_applications(college_id, company_name);

-- Interview rounds (per application)
create table if not exists public.interview_rounds (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.student_applications(id) on delete cascade,
  round_number integer not null default 1,
  round_type text,
  scheduled_at timestamptz,
  outcome text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_rounds_application on public.interview_rounds(application_id);

-- Offers (per application or student)
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.student_applications(id) on delete set null,
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  company_name text not null,
  role text,
  amount numeric,
  currency text default 'INR',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offers_student on public.offers(student_id);
create index if not exists idx_offers_college on public.offers(college_id);

-- Placement status history (audit trail for profile status changes)
create table if not exists public.placement_status_history (
  id uuid primary key default gen_random_uuid(),
  placement_profile_id uuid not null references public.placement_profiles(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  notes text
);

create index if not exists idx_placement_status_history_profile on public.placement_status_history(placement_profile_id);

-- Placement documents (resume, offer letter, placement proof)
create table if not exists public.placement_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  document_type text not null check (document_type in ('resume', 'offer_letter', 'placement_proof', 'other')),
  file_url text not null,
  file_name text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_placement_documents_student on public.placement_documents(student_id);
create index if not exists idx_placement_documents_college on public.placement_documents(college_id);

-- Triggers
drop trigger if exists placement_profiles_updated_at on public.placement_profiles;
create trigger placement_profiles_updated_at before update on public.placement_profiles for each row execute function public.set_updated_at();
drop trigger if exists linkedin_reviews_updated_at on public.linkedin_reviews;
create trigger linkedin_reviews_updated_at before update on public.linkedin_reviews for each row execute function public.set_updated_at();
drop trigger if exists github_reviews_updated_at on public.github_reviews;
create trigger github_reviews_updated_at before update on public.github_reviews for each row execute function public.set_updated_at();
drop trigger if exists mock_interviews_updated_at on public.mock_interviews;
create trigger mock_interviews_updated_at before update on public.mock_interviews for each row execute function public.set_updated_at();
drop trigger if exists student_applications_updated_at on public.student_applications;
create trigger student_applications_updated_at before update on public.student_applications for each row execute function public.set_updated_at();
drop trigger if exists offers_updated_at on public.offers;
create trigger offers_updated_at before update on public.offers for each row execute function public.set_updated_at();

-- RLS: ensure helper functions exist (may already exist from content_delivery migration)
create or replace function public.is_college_content_manager(p_college_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.college_memberships m
    where m.college_id = p_college_id and m.user_id = auth.uid()
    and m.status = 'active' and m.role in ('college_admin', 'faculty_spoc')
  );
$$;
create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin');
$$;

alter table public.placement_profiles enable row level security;
alter table public.resume_versions enable row level security;
alter table public.linkedin_reviews enable row level security;
alter table public.github_reviews enable row level security;
alter table public.placement_readiness_reviews enable row level security;
alter table public.mock_interviews enable row level security;
alter table public.student_applications enable row level security;
alter table public.interview_rounds enable row level security;
alter table public.offers enable row level security;
alter table public.placement_status_history enable row level security;
alter table public.placement_documents enable row level security;

-- placement_profiles: student own; content managers all for college
drop policy if exists "Students read own placement_profiles" on public.placement_profiles;
create policy "Students read own placement_profiles" on public.placement_profiles for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Students insert own placement_profiles" on public.placement_profiles;
create policy "Students insert own placement_profiles" on public.placement_profiles for insert
  with check (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Students update own placement_profiles" on public.placement_profiles;
create policy "Students update own placement_profiles" on public.placement_profiles for update
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Content managers full placement_profiles" on public.placement_profiles;
create policy "Content managers full placement_profiles" on public.placement_profiles for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full placement_profiles" on public.placement_profiles;
create policy "Superadmin full placement_profiles" on public.placement_profiles for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- resume_versions: via profile access
drop policy if exists "Students read own resume_versions" on public.resume_versions;
create policy "Students read own resume_versions" on public.resume_versions for select
  using (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = auth.uid()));
drop policy if exists "Students insert own resume_versions" on public.resume_versions;
create policy "Students insert own resume_versions" on public.resume_versions for insert
  with check (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = auth.uid()));
drop policy if exists "Content managers full resume_versions" on public.resume_versions;
create policy "Content managers full resume_versions" on public.resume_versions for all
  using (placement_profile_id in (select pp.id from public.placement_profiles pp where public.is_college_content_manager(pp.college_id)));
drop policy if exists "Superadmin full resume_versions" on public.resume_versions;
create policy "Superadmin full resume_versions" on public.resume_versions for all using (public.is_superadmin()) with check (public.is_superadmin());

-- linkedin_reviews
drop policy if exists "Students read own linkedin_reviews" on public.linkedin_reviews;
create policy "Students read own linkedin_reviews" on public.linkedin_reviews for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Content managers full linkedin_reviews" on public.linkedin_reviews;
create policy "Content managers full linkedin_reviews" on public.linkedin_reviews for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full linkedin_reviews" on public.linkedin_reviews;
create policy "Superadmin full linkedin_reviews" on public.linkedin_reviews for all using (public.is_superadmin()) with check (public.is_superadmin());

-- github_reviews
drop policy if exists "Students read own github_reviews" on public.github_reviews;
create policy "Students read own github_reviews" on public.github_reviews for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Content managers full github_reviews" on public.github_reviews;
create policy "Content managers full github_reviews" on public.github_reviews for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full github_reviews" on public.github_reviews;
create policy "Superadmin full github_reviews" on public.github_reviews for all using (public.is_superadmin()) with check (public.is_superadmin());

-- placement_readiness_reviews
drop policy if exists "Students read own placement_readiness_reviews" on public.placement_readiness_reviews;
create policy "Students read own placement_readiness_reviews" on public.placement_readiness_reviews for select
  using (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = auth.uid()));
drop policy if exists "Content managers full placement_readiness_reviews" on public.placement_readiness_reviews;
create policy "Content managers full placement_readiness_reviews" on public.placement_readiness_reviews for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full placement_readiness_reviews" on public.placement_readiness_reviews;
create policy "Superadmin full placement_readiness_reviews" on public.placement_readiness_reviews for all using (public.is_superadmin()) with check (public.is_superadmin());

-- mock_interviews
drop policy if exists "Students read own mock_interviews" on public.mock_interviews;
create policy "Students read own mock_interviews" on public.mock_interviews for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Content managers full mock_interviews" on public.mock_interviews;
create policy "Content managers full mock_interviews" on public.mock_interviews for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full mock_interviews" on public.mock_interviews;
create policy "Superadmin full mock_interviews" on public.mock_interviews for all using (public.is_superadmin()) with check (public.is_superadmin());

-- student_applications
drop policy if exists "Students full own student_applications" on public.student_applications;
create policy "Students full own student_applications" on public.student_applications for all
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()))
  with check (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Content managers full student_applications" on public.student_applications;
create policy "Content managers full student_applications" on public.student_applications for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full student_applications" on public.student_applications;
create policy "Superadmin full student_applications" on public.student_applications for all using (public.is_superadmin()) with check (public.is_superadmin());

-- interview_rounds (via application)
drop policy if exists "Students read own interview_rounds" on public.interview_rounds;
create policy "Students read own interview_rounds" on public.interview_rounds for select
  using (application_id in (select a.id from public.student_applications a join public.students s on s.id = a.student_id where s.user_id = auth.uid()));
drop policy if exists "Students insert own interview_rounds" on public.interview_rounds;
create policy "Students insert own interview_rounds" on public.interview_rounds for insert
  with check (application_id in (select a.id from public.student_applications a join public.students s on s.id = a.student_id where s.user_id = auth.uid()));
drop policy if exists "Content managers full interview_rounds" on public.interview_rounds;
create policy "Content managers full interview_rounds" on public.interview_rounds for all
  using (application_id in (select a.id from public.student_applications a where public.is_college_content_manager(a.college_id)));
drop policy if exists "Superadmin full interview_rounds" on public.interview_rounds;
create policy "Superadmin full interview_rounds" on public.interview_rounds for all using (public.is_superadmin()) with check (public.is_superadmin());

-- offers
drop policy if exists "Students read own offers" on public.offers;
create policy "Students read own offers" on public.offers for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Students insert own offers" on public.offers;
create policy "Students insert own offers" on public.offers for insert
  with check (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Content managers full offers" on public.offers;
create policy "Content managers full offers" on public.offers for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full offers" on public.offers;
create policy "Superadmin full offers" on public.offers for all using (public.is_superadmin()) with check (public.is_superadmin());

-- placement_status_history
drop policy if exists "Students read own placement_status_history" on public.placement_status_history;
create policy "Students read own placement_status_history" on public.placement_status_history for select
  using (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = auth.uid()));
drop policy if exists "Content managers full placement_status_history" on public.placement_status_history;
create policy "Content managers full placement_status_history" on public.placement_status_history for all
  using (placement_profile_id in (select pp.id from public.placement_profiles pp where public.is_college_content_manager(pp.college_id)));
drop policy if exists "Superadmin full placement_status_history" on public.placement_status_history;
create policy "Superadmin full placement_status_history" on public.placement_status_history for all using (public.is_superadmin()) with check (public.is_superadmin());

-- placement_documents
drop policy if exists "Students read own placement_documents" on public.placement_documents;
create policy "Students read own placement_documents" on public.placement_documents for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Students insert own placement_documents" on public.placement_documents;
create policy "Students insert own placement_documents" on public.placement_documents for insert
  with check (student_id in (select s.id from public.students s where s.user_id = auth.uid()));
drop policy if exists "Content managers full placement_documents" on public.placement_documents;
create policy "Content managers full placement_documents" on public.placement_documents for all
  using (public.is_college_content_manager(college_id)) with check (public.is_college_content_manager(college_id));
drop policy if exists "Superadmin full placement_documents" on public.placement_documents;
create policy "Superadmin full placement_documents" on public.placement_documents for all using (public.is_superadmin()) with check (public.is_superadmin());
