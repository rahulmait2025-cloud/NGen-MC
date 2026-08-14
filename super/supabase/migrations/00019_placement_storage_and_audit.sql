-- Placement docs storage bucket and RLS; optional audit policy for college admins to read placement audit logs.

-- Bucket: private, 10MB, PDF and images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'placement-docs',
  'placement-docs',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path format: college_id/student_id/type/filename (e.g. resume, offer_letter, placement_proof)
-- Content managers: full access to their college's folder. Students: access only to their student_id folder under their college.

drop policy if exists "Placement docs: content managers full access for their college" on storage.objects;
create policy "Placement docs: content managers full access for their college"
on storage.objects for all
to authenticated
using (
  bucket_id = 'placement-docs'
  and (storage.foldername(name))[1]::uuid in (
    select m.college_id from public.college_memberships m
    where m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('college_admin', 'faculty_spoc')
  )
)
with check (
  bucket_id = 'placement-docs'
  and (storage.foldername(name))[1]::uuid in (
    select m.college_id from public.college_memberships m
    where m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('college_admin', 'faculty_spoc')
  )
);

drop policy if exists "Placement docs: students access own folder" on storage.objects;
create policy "Placement docs: students access own folder"
on storage.objects for all
to authenticated
using (
  bucket_id = 'placement-docs'
  and (storage.foldername(name))[1]::uuid = (select s.college_id from public.students s where s.user_id = auth.uid() limit 1)
  and (storage.foldername(name))[2]::uuid = (select s.id from public.students s where s.user_id = auth.uid() limit 1)
)
with check (
  bucket_id = 'placement-docs'
  and (storage.foldername(name))[1]::uuid = (select s.college_id from public.students s where s.user_id = auth.uid() limit 1)
  and (storage.foldername(name))[2]::uuid = (select s.id from public.students s where s.user_id = auth.uid() limit 1)
);

drop policy if exists "Placement docs: superadmin full access" on storage.objects;
create policy "Placement docs: superadmin full access"
on storage.objects for all
to authenticated
using (
  bucket_id = 'placement-docs'
  and exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
)
with check (
  bucket_id = 'placement-docs'
  and exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
);

-- College admins can read audit_logs for their college (placement and other actions)
drop policy if exists "Content managers can read audit logs for their college" on public.audit_logs;
create policy "Content managers can read audit logs for their college"
on public.audit_logs for select
to authenticated
using (
  college_id in (
    select m.college_id from public.college_memberships m
    where m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('college_admin', 'faculty_spoc')
  )
);
