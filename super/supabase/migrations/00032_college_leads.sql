-- College partnership leads captured from landing page contact forms.
-- Allows public insert (gated by RLS), SuperAdmin full access.

create table if not exists public.college_leads (
  id uuid primary key default gen_random_uuid(),
  
  -- Contact information
  full_name text not null,
  work_email text not null,
  phone_number text not null,
  college_name text not null,
  designation text,
  city text,
  state text,
  
  -- College details
  college_type text check (college_type in ('bca', 'btech', 'engineering', 'university', 'other')),
  student_count text,
  website_url text,
  
  -- Interest & message
  interest_type text check (interest_type in ('demo', 'partnership', 'pilot_program', 'placement_bootcamp', 'custom_lms')),
  message text,
  consent_given boolean not null default false,
  
  -- UTM / Attribution tracking
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  
  -- Lead management (SuperAdmin use)
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'demo_scheduled', 'converted', 'closed', 'spam')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  last_contacted_at timestamptz,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_college_leads_status on public.college_leads(status);
create index if not exists idx_college_leads_created_at on public.college_leads(created_at desc);
create index if not exists idx_college_leads_work_email on public.college_leads(work_email);
create index if not exists idx_college_leads_college_name on public.college_leads(lower(college_name));
create index if not exists idx_college_leads_priority on public.college_leads(priority);

-- Trigger for updated_at (uses canonical set_updated_at() from 00001)
drop trigger if exists college_leads_updated_at on public.college_leads;
create trigger college_leads_updated_at
  before update on public.college_leads
  for each row execute function public.set_updated_at();

-- RLS Policies
alter table public.college_leads enable row level security;

-- Landing page form submissions use service_role client (bypasses RLS).
-- Direct authenticated insert allowed for admin tooling; anon blocked.
drop policy if exists "Public can insert college leads" on public.college_leads;
create policy "Authenticated can insert college leads"
  on public.college_leads for insert
  to authenticated
  with check (true);

-- Only SuperAdmins can read leads
drop policy if exists "SuperAdmin can read college leads" on public.college_leads;
create policy "SuperAdmin can read college leads"
  on public.college_leads for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.global_role = 'superadmin'
    )
  );

-- Only SuperAdmins can update leads (status, notes, assignment)
drop policy if exists "SuperAdmin can update college leads" on public.college_leads;
create policy "SuperAdmin can update college leads"
  on public.college_leads for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.global_role = 'superadmin'
    )
  );

-- Only SuperAdmins can delete leads (e.g., spam cleanup)
drop policy if exists "SuperAdmin can delete college leads" on public.college_leads;
create policy "SuperAdmin can delete college leads"
  on public.college_leads for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.global_role = 'superadmin'
    )
  );

-- Prevent rapid duplicate submissions (same email within 5 minutes)
create or replace function public.check_college_lead_duplicate()
returns trigger as $$
begin
  if exists (
    select 1 from public.college_leads
    where work_email = new.work_email
    and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Duplicate submission. Please wait before submitting again.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists college_leads_duplicate_check on public.college_leads;
create trigger college_leads_duplicate_check
  before insert on public.college_leads
  for each row execute function public.check_college_lead_duplicate();
