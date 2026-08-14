-- Align tiered_price_records.state and tiered_assignments.status with app model (Phase 5 fixup).
-- Price: replace literal 'retired' with 'expired' (keep draft, scheduled, active, superseded).
-- Assignments: drop 'paused' (map any existing rows to 'active', then tighten check).

-- ─── tiered_price_records.state: retired → expired ───────────────────────────

update public.tiered_price_records
set state = 'expired'
where state = 'retired';

alter table public.tiered_price_records
  drop constraint if exists tiered_price_records_state_check;

alter table public.tiered_price_records
  add constraint tiered_price_records_state_check
  check (state in ('draft', 'scheduled', 'active', 'expired', 'superseded'));

-- ─── tiered_assignments.status: remove paused ────────────────────────────────

update public.tiered_assignments
set status = 'active'
where status = 'paused';

alter table public.tiered_assignments
  drop constraint if exists tiered_assignments_status_check;

alter table public.tiered_assignments
  add constraint tiered_assignments_status_check
  check (status in ('scheduled', 'active', 'ended', 'cancelled'));
