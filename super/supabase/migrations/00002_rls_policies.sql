-- Phase 5: RLS policies for tenant isolation
-- Security: college_id is the boundary; slug is for routing only.
-- Idempotent: drop before create so re-run on existing DB works.

-- colleges: superadmin can do everything; others can only read active colleges (for branding)
drop policy if exists "Superadmin full access colleges" on public.colleges;
create policy "Superadmin full access colleges"
  on public.colleges for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and global_role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and global_role = 'superadmin'
    )
  );

drop policy if exists "Anyone can read active colleges by slug" on public.colleges;
create policy "Anyone can read active colleges by slug"
  on public.colleges for select
  using (status = 'active');

-- profiles: users can read/update own profile; superadmin can read all
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

drop policy if exists "Superadmin can read all profiles" on public.profiles;
create policy "Superadmin can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.global_role = 'superadmin'
    )
  );

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- college_memberships
drop policy if exists "Users can read own memberships" on public.college_memberships;
create policy "Users can read own memberships"
  on public.college_memberships for select
  using (user_id = auth.uid());

drop policy if exists "College admin can read memberships for their college" on public.college_memberships;
create policy "College admin can read memberships for their college"
  on public.college_memberships for select
  using (
    college_id in (
      select college_id from public.college_memberships
      where user_id = auth.uid() and role = 'college_admin' and status = 'active'
    )
  );

drop policy if exists "Superadmin full access college_memberships" on public.college_memberships;
create policy "Superadmin full access college_memberships"
  on public.college_memberships for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
  );

-- students
drop policy if exists "Students can read own record" on public.students;
create policy "Students can read own record"
  on public.students for select
  using (user_id = auth.uid());

drop policy if exists "College admin can read students in their college" on public.students;
create policy "College admin can read students in their college"
  on public.students for select
  using (
    college_id in (
      select college_id from public.college_memberships
      where user_id = auth.uid() and role = 'college_admin' and status = 'active'
    )
  );

drop policy if exists "College admin can update students in their college" on public.students;
create policy "College admin can update students in their college"
  on public.students for update
  using (
    college_id in (
      select college_id from public.college_memberships
      where user_id = auth.uid() and role = 'college_admin' and status = 'active'
    )
  );

drop policy if exists "Superadmin full access students" on public.students;
create policy "Superadmin full access students"
  on public.students for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
  );

drop policy if exists "College admin can insert students in their college" on public.students;
create policy "College admin can insert students in their college"
  on public.students for insert
  with check (
    college_id in (
      select college_id from public.college_memberships
      where user_id = auth.uid() and role = 'college_admin' and status = 'active'
    )
  );

drop policy if exists "College admin can insert memberships in their college" on public.college_memberships;
create policy "College admin can insert memberships in their college"
  on public.college_memberships for insert
  with check (
    college_id in (
      select college_id from public.college_memberships
      where user_id = auth.uid() and role = 'college_admin' and status = 'active'
    )
  );
