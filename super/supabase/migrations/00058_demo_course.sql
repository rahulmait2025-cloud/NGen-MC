-- Demo Course Landing Platform
-- Adds demo course builder tables for SuperAdmin, CollegeAdmin, and LMS.
-- Uses the same Supabase DB as the existing global_courses system.

-- ─── 1. demo_courses (root table) ────────────────────────────────────────────

create table if not exists public.demo_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  hero_image_url text,
  hero_video_url text,
  thumbnail_url text,
  category text,
  tags text[] not null default '{}',
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_label text,
  language text not null default 'English',
  rating_avg numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  enrollment_count integer not null default 0 check (enrollment_count >= 0),
  price_minor integer not null default 0 check (price_minor >= 0),
  currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
  display_price_label text,
  is_free boolean not null default true,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  unpublished_at timestamptz,
  meta_title text,
  meta_description text,
  meta_keywords text[],
  landing_config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_courses_publish_timestamps_chk check (
    (publish_status = 'published' and published_at is not null) or publish_status <> 'published'
  )
);

comment on table public.demo_courses is 'Demo course catalog for landing page builder. SuperAdmin creates and manages; CollegeAdmin and LMS consume published courses.';

create index if not exists idx_demo_courses_slug on public.demo_courses(lower(slug));
create index if not exists idx_demo_courses_status on public.demo_courses(publish_status, published_at desc);
create index if not exists idx_demo_courses_category on public.demo_courses(category) where category is not null;

create trigger trg_demo_courses_updated_at
  before update on public.demo_courses
  for each row execute function public.set_updated_at();

-- ─── 2. demo_course_outcomes ─────────────────────────────────────────────────

create table if not exists public.demo_course_outcomes (
  id uuid primary key default gen_random_uuid(),
  demo_course_id uuid not null references public.demo_courses(id) on delete cascade,
  title text not null,
  description text,
  icon_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_course_id, sort_order)
);

create index if not exists idx_demo_course_outcomes_course on public.demo_course_outcomes(demo_course_id, sort_order);

create trigger trg_demo_course_outcomes_updated_at
  before update on public.demo_course_outcomes
  for each row execute function public.set_updated_at();

-- ─── 3. demo_course_curriculum ───────────────────────────────────────────────

create table if not exists public.demo_course_curriculum (
  id uuid primary key default gen_random_uuid(),
  demo_course_id uuid not null references public.demo_courses(id) on delete cascade,
  title text not null,
  description text,
  duration_label text,
  topics text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_course_id, sort_order)
);

create index if not exists idx_demo_course_curriculum_course on public.demo_course_curriculum(demo_course_id, sort_order);

create trigger trg_demo_course_curriculum_updated_at
  before update on public.demo_course_curriculum
  for each row execute function public.set_updated_at();

-- ─── 4. demo_course_instructors ──────────────────────────────────────────────

create table if not exists public.demo_course_instructors (
  id uuid primary key default gen_random_uuid(),
  demo_course_id uuid not null references public.demo_courses(id) on delete cascade,
  name text not null,
  title text,
  bio text,
  avatar_url text,
  company text,
  linkedin_url text,
  twitter_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_course_id, sort_order)
);

create index if not exists idx_demo_course_instructors_course on public.demo_course_instructors(demo_course_id, sort_order);

create trigger trg_demo_course_instructors_updated_at
  before update on public.demo_course_instructors
  for each row execute function public.set_updated_at();

-- ─── 5. demo_course_testimonials ─────────────────────────────────────────────

create table if not exists public.demo_course_testimonials (
  id uuid primary key default gen_random_uuid(),
  demo_course_id uuid not null references public.demo_courses(id) on delete cascade,
  name text not null,
  role text,
  company text,
  quote text not null,
  avatar_url text,
  rating integer not null default 5 check (rating >= 1 and rating <= 5),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_course_id, sort_order)
);

create index if not exists idx_demo_course_testimonials_course on public.demo_course_testimonials(demo_course_id, sort_order);

create trigger trg_demo_course_testimonials_updated_at
  before update on public.demo_course_testimonials
  for each row execute function public.set_updated_at();

-- ─── 6. demo_course_faqs ─────────────────────────────────────────────────────

create table if not exists public.demo_course_faqs (
  id uuid primary key default gen_random_uuid(),
  demo_course_id uuid not null references public.demo_courses(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_course_id, sort_order)
);

create index if not exists idx_demo_course_faqs_course on public.demo_course_faqs(demo_course_id, sort_order);

create trigger trg_demo_course_faqs_updated_at
  before update on public.demo_course_faqs
  for each row execute function public.set_updated_at();

-- ─── 7. demo_course_features ─────────────────────────────────────────────────

create table if not exists public.demo_course_features (
  id uuid primary key default gen_random_uuid(),
  demo_course_id uuid not null references public.demo_courses(id) on delete cascade,
  title text not null,
  description text,
  icon_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_course_id, sort_order)
);

create index if not exists idx_demo_course_features_course on public.demo_course_features(demo_course_id, sort_order);

create trigger trg_demo_course_features_updated_at
  before update on public.demo_course_features
  for each row execute function public.set_updated_at();

-- ─── 8. demo_course_stats ────────────────────────────────────────────────────

create table if not exists public.demo_course_stats (
  id uuid primary key default gen_random_uuid(),
  demo_course_id uuid not null references public.demo_courses(id) on delete cascade,
  label text not null,
  value text not null,
  icon_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_course_id, sort_order)
);

create index if not exists idx_demo_course_stats_course on public.demo_course_stats(demo_course_id, sort_order);

create trigger trg_demo_course_stats_updated_at
  before update on public.demo_course_stats
  for each row execute function public.set_updated_at();

-- ─── RLS Policies ────────────────────────────────────────────────────────────

alter table public.demo_courses enable row level security;
alter table public.demo_course_outcomes enable row level security;
alter table public.demo_course_curriculum enable row level security;
alter table public.demo_course_instructors enable row level security;
alter table public.demo_course_testimonials enable row level security;
alter table public.demo_course_faqs enable row level security;
alter table public.demo_course_features enable row level security;
alter table public.demo_course_stats enable row level security;

-- Superadmin full access
create policy demo_courses_superadmin_all on public.demo_courses
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy demo_course_outcomes_superadmin_all on public.demo_course_outcomes
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy demo_course_curriculum_superadmin_all on public.demo_course_curriculum
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy demo_course_instructors_superadmin_all on public.demo_course_instructors
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy demo_course_testimonials_superadmin_all on public.demo_course_testimonials
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy demo_course_faqs_superadmin_all on public.demo_course_faqs
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy demo_course_features_superadmin_all on public.demo_course_features
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy demo_course_stats_superadmin_all on public.demo_course_stats
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- Published courses readable by authenticated users (students, college admins)
create policy demo_courses_published_select on public.demo_courses
  for select using (publish_status = 'published' and auth.uid() is not null);

create policy demo_course_outcomes_published_select on public.demo_course_outcomes
  for select using (exists (select 1 from public.demo_courses dc where dc.id = demo_course_id and dc.publish_status = 'published'));

create policy demo_course_curriculum_published_select on public.demo_course_curriculum
  for select using (exists (select 1 from public.demo_courses dc where dc.id = demo_course_id and dc.publish_status = 'published'));

create policy demo_course_instructors_published_select on public.demo_course_instructors
  for select using (exists (select 1 from public.demo_courses dc where dc.id = demo_course_id and dc.publish_status = 'published'));

create policy demo_course_testimonials_published_select on public.demo_course_testimonials
  for select using (exists (select 1 from public.demo_courses dc where dc.id = demo_course_id and dc.publish_status = 'published'));

create policy demo_course_faqs_published_select on public.demo_course_faqs
  for select using (exists (select 1 from public.demo_courses dc where dc.id = demo_course_id and dc.publish_status = 'published'));

create policy demo_course_features_published_select on public.demo_course_features
  for select using (exists (select 1 from public.demo_courses dc where dc.id = demo_course_id and dc.publish_status = 'published'));

create policy demo_course_stats_published_select on public.demo_course_stats
  for select using (exists (select 1 from public.demo_courses dc where dc.id = demo_course_id and dc.publish_status = 'published'));

-- ─── Helper: is_superadmin() (reuse existing if available) ────────────────────

-- The public.is_superadmin() function is already defined in prior migrations.
-- We reference it directly in the RLS policies above.

-- ─── View: demo_course_landing_sections ──────────────────────────────────────

create or replace view public.v_demo_course_landing_sections as
select
  dc.id as demo_course_id,
  dc.title,
  dc.subtitle,
  dc.description,
  dc.hero_image_url,
  dc.hero_video_url,
  dc.thumbnail_url,
  dc.category,
  dc.tags,
  dc.difficulty,
  dc.duration_label,
  dc.language,
  dc.rating_avg,
  dc.rating_count,
  dc.enrollment_count,
  dc.price_minor,
  dc.currency_code,
  dc.display_price_label,
  dc.is_free,
  dc.publish_status,
  dc.slug,
  dc.landing_config,
  (select count(*) from public.demo_course_outcomes o where o.demo_course_id = dc.id) as outcome_count,
  (select count(*) from public.demo_course_curriculum c where c.demo_course_id = dc.id) as curriculum_section_count,
  (select count(*) from public.demo_course_instructors i where i.demo_course_id = dc.id) as instructor_count,
  (select count(*) from public.demo_course_testimonials t where t.demo_course_id = dc.id) as testimonial_count,
  (select count(*) from public.demo_course_faqs f where f.demo_course_id = dc.id) as faq_count,
  (select count(*) from public.demo_course_features f where f.demo_course_id = dc.id) as feature_count,
  (select count(*) from public.demo_course_stats s where s.demo_course_id = dc.id) as stat_count
from public.demo_courses dc;

comment on view public.v_demo_course_landing_sections is 'Denormalized view of demo course landing page section counts for builder UI.';