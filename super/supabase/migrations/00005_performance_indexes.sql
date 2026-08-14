-- Phase 10: Performance indexes for scale (read-heavy auth + tenant queries)
-- Safe to run multiple times.

create index if not exists idx_colleges_lower_slug
  on public.colleges (lower(slug));

create index if not exists idx_college_memberships_college_role_status
  on public.college_memberships (college_id, role, status);

create index if not exists idx_college_memberships_user_role_status
  on public.college_memberships (user_id, role, status);

create index if not exists idx_college_memberships_active_college_role
  on public.college_memberships (college_id, role)
  where status = 'active';

create index if not exists idx_students_college_user
  on public.students (college_id, user_id);

create index if not exists idx_students_user_college
  on public.students (user_id, college_id);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'audit_logs'
  ) then
    create index if not exists idx_audit_logs_action_created
      on public.audit_logs (action, created_at desc);

    create index if not exists idx_audit_logs_resource
      on public.audit_logs (resource_type, resource_id);
  end if;
end
$$;
