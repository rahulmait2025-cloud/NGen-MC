-- Cleanup legacy auth storage and login-time mutation paths.
-- Non-destructive preference: rename legacy tables to z_backup_* if they exist.

do $$
begin
  if to_regclass('public.username') is not null and to_regclass('public.z_backup_username') is null then
    execute 'alter table public.username rename to z_backup_username';
  end if;

  if to_regclass('public.user_credentials') is not null and to_regclass('public.z_backup_user_credentials') is null then
    execute 'alter table public.user_credentials rename to z_backup_user_credentials';
  end if;
end
$$;

alter table if exists public.profiles drop column if exists password;
alter table if exists public.profiles drop column if exists password_hash;
alter table if exists public.profiles drop column if exists temp_password;
alter table if exists public.profiles drop column if exists username;

drop policy if exists "Students can insert own record when has membership" on public.students;
