-- Allow a user to insert their own students row when they have a student membership for that college.
-- Used for first-login profile auto-creation (invite flow: membership may exist before students row in edge cases).
drop policy if exists "Students can insert own record when has membership" on public.students;
create policy "Students can insert own record when has membership"
  on public.students for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.college_memberships
      where user_id = auth.uid()
        and college_id = students.college_id
        and role = 'student'
        and status in ('active', 'invited')
    )
  );
