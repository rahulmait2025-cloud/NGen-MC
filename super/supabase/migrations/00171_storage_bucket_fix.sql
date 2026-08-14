-- ============================================================
-- 00171: Fix public bucket allows listing
-- Security fix - part 5
-- ============================================================

begin;

drop policy if exists "Brand assets: public read" on storage.objects;
create policy "brand_assets_no_listing" on storage.objects for select to authenticated using (bucket_id = 'brand-assets');

commit;