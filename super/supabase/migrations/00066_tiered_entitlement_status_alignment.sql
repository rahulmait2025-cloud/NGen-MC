-- Align tiered_entitlements.status with canonical model: active | expired | revoked (no pending).

update public.tiered_entitlements
set status = 'active'
where status = 'pending';

drop index if exists public.idx_tiered_entitlements_student_status_active_pending;

create index if not exists idx_tiered_entitlements_student_status_active
  on public.tiered_entitlements (student_id)
  where status = 'active';

alter table public.tiered_entitlements
  drop constraint if exists tiered_entitlements_status_check;

alter table public.tiered_entitlements
  add constraint tiered_entitlements_status_check
  check (status in ('active', 'expired', 'revoked'));
