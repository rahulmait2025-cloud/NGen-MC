-- Add soft-removal tracking for TPStreams folder sync.
--
-- We keep rows when an asset disappears from the TPStreams folder so:
-- - curriculum/item links are not hard-broken
-- - admins can still inspect historical rows
-- - standard course asset listings can reflect only the active TP folder contents

alter table public.video_assets
  add column if not exists sync_status text not null default 'active'
    check (sync_status in ('active', 'removed'));

alter table public.video_assets
  add column if not exists removed_at timestamptz;

comment on column public.video_assets.sync_status is
  'Whether the TPStreams asset is currently present in the synced course folder: active or removed.';

comment on column public.video_assets.removed_at is
  'Timestamp when the asset was first observed missing from the TPStreams course folder. Null while active.';

create index if not exists idx_video_assets_master_course_sync_status
  on public.video_assets (master_course_id, sync_status, sort_order);
