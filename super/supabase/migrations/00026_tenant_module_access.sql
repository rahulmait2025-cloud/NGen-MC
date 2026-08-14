-- Tenant-level module access overrides (manual lock/unlock by Super Admin).
-- Layers on top of plan-based get_effective_features; final access = plan features + this override.

create table if not exists public.tenant_module_overrides (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  module_key text not null,
  college_admin_enabled boolean not null default true,
  student_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (college_id, module_key)
);

create index if not exists idx_tenant_module_overrides_college_id on public.tenant_module_overrides(college_id);
create index if not exists idx_tenant_module_overrides_module_key on public.tenant_module_overrides(module_key);

comment on table public.tenant_module_overrides is 'Super Admin manual lock/unlock per module per tenant. When set, overrides plan-based feature access for that audience.';

-- Audit log for override changes
create table if not exists public.tenant_module_access_audit (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  module_key text not null,
  changed_by uuid references auth.users(id) on delete set null,
  previous_college_admin_enabled boolean,
  previous_student_enabled boolean,
  new_college_admin_enabled boolean,
  new_student_enabled boolean,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_module_access_audit_college_id on public.tenant_module_access_audit(college_id);
create index if not exists idx_tenant_module_access_audit_created_at on public.tenant_module_access_audit(created_at desc);

comment on table public.tenant_module_access_audit is 'Audit trail for tenant_module_overrides changes.';

-- Module access appeals (College Admin / Student request to unlock)
create table if not exists public.module_access_appeals (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  module_key text not null,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_role text not null check (requester_role in ('college_admin', 'student')),
  subject text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'approved', 'rejected')),
  super_admin_response text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_module_access_appeals_college_id on public.module_access_appeals(college_id);
create index if not exists idx_module_access_appeals_status on public.module_access_appeals(status);
create index if not exists idx_module_access_appeals_requester on public.module_access_appeals(requester_user_id);
create index if not exists idx_module_access_appeals_created_at on public.module_access_appeals(created_at desc);

comment on table public.module_access_appeals is 'Appeals from College Admin or Student to unlock a module; reviewed by Super Admin.';

drop trigger if exists tenant_module_overrides_updated_at on public.tenant_module_overrides;
create trigger tenant_module_overrides_updated_at
  before update on public.tenant_module_overrides
  for each row execute function public.set_updated_at();

drop trigger if exists module_access_appeals_updated_at on public.module_access_appeals;
create trigger module_access_appeals_updated_at
  before update on public.module_access_appeals
  for each row execute function public.set_updated_at();

-- RLS: tenant_module_overrides (Super Admin full access; college admins read-only for their college)
alter table public.tenant_module_overrides enable row level security;

create policy "Super Admin can manage tenant_module_overrides"
  on public.tenant_module_overrides for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.global_role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.global_role = 'superadmin'
    )
  );

create policy "College Admin can read own college overrides"
  on public.tenant_module_overrides for select
  using (
    exists (
      select 1 from public.college_memberships cm
      where cm.user_id = auth.uid() and cm.college_id = tenant_module_overrides.college_id
      and cm.role in ('college_admin', 'faculty_spoc', 'mentor') and cm.status in ('active', 'invited')
    )
  );

-- RLS: audit table (Super Admin read; insert by service/super_admin only in app)
alter table public.tenant_module_access_audit enable row level security;

create policy "Super Admin can read tenant_module_access_audit"
  on public.tenant_module_access_audit for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  );

create policy "Super Admin and service can insert tenant_module_access_audit"
  on public.tenant_module_access_audit for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  );

-- RLS: module_access_appeals
alter table public.module_access_appeals enable row level security;

create policy "Requester can read own appeals"
  on public.module_access_appeals for select
  using (requester_user_id = auth.uid());

create policy "College Admin and Student can insert appeals for their college"
  on public.module_access_appeals for insert
  with check (
    requester_user_id = auth.uid()
    and (
      exists (
        select 1 from public.college_memberships cm
        where cm.user_id = auth.uid() and cm.college_id = module_access_appeals.college_id
        and cm.role in ('college_admin', 'faculty_spoc', 'mentor', 'student') and cm.status in ('active', 'invited')
      )
    )
  );

create policy "Super Admin can read and update all appeals"
  on public.module_access_appeals for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  );

-- Grants
grant select, insert, update, delete on public.tenant_module_overrides to authenticated;
grant select, insert on public.tenant_module_access_audit to authenticated;
grant select, insert, update on public.module_access_appeals to authenticated;
