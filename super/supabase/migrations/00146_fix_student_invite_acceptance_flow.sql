-- Pending student invites: token hash stored server-side; plain token only in email URL.
-- Students/memberships/profiles for new invites are created only after password setup (student app).

create table if not exists public.student_invites (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete cascade,
  email text not null,
  full_name text,
  student_code text,
  cohort_id uuid references public.cohorts (id) on delete set null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  accepted_user_id uuid references auth.users (id) on delete set null,
  accepted_student_id uuid references public.students (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_invites_token_hash_unique unique (token_hash)
);

create index if not exists idx_student_invites_token_hash on public.student_invites (token_hash);
create index if not exists idx_student_invites_email_lower on public.student_invites (lower(email));
create index if not exists idx_student_invites_college_id on public.student_invites (college_id);
create index if not exists idx_student_invites_status on public.student_invites (status);
create index if not exists idx_student_invites_expires_at on public.student_invites (expires_at);
create index if not exists idx_student_invites_college_email_pending
  on public.student_invites (college_id, lower(email))
  where status = 'pending' and revoked_at is null;

drop trigger if exists trg_student_invites_updated_at on public.student_invites;
create trigger trg_student_invites_updated_at
  before update on public.student_invites
  for each row execute function public.set_updated_at();

alter table public.student_invites enable row level security;

comment on table public.student_invites is
  'Super Admin student email invites. Plain token is sent by email only; token_hash is sha256 hex. Row created before auth user/student exist.';
