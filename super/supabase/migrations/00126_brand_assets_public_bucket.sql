-- Public bucket for brand images used in email HTML (Gmail-safe HTTPS URLs).
-- Path convention: nextgen-cto/<filename>

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Brand assets: public read" on storage.objects;
create policy "Brand assets: public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'brand-assets');

drop policy if exists "Brand assets: superadmin insert" on storage.objects;
create policy "Brand assets: superadmin insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'brand-assets'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true
  )
);

drop policy if exists "Brand assets: superadmin update" on storage.objects;
create policy "Brand assets: superadmin update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'brand-assets'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true
  )
)
with check (
  bucket_id = 'brand-assets'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true
  )
);

drop policy if exists "Brand assets: superadmin delete" on storage.objects;
create policy "Brand assets: superadmin delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'brand-assets'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true
  )
);

commit;
