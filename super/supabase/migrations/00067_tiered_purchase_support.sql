-- Phase 7: extend global_course_order_intents for tiered bundle/variant purchases (additive).
-- Reuses Razorpay order flow; global_course rows stay unchanged (product_line default).

alter table public.global_course_order_intents
  alter column course_id drop not null;

alter table public.global_course_order_intents
  add column if not exists product_line text not null default 'global_course';

alter table public.global_course_order_intents
  add column if not exists tiered_target_id uuid;

comment on column public.global_course_order_intents.product_line is
  'global_course | tiered_bundle | tiered_course_variant — tiered lines use tiered_target_id; course_id null.';

comment on column public.global_course_order_intents.tiered_target_id is
  'When product_line is tiered_*: bundle id or course variant id being purchased.';

alter table public.global_course_order_intents
  drop constraint if exists global_course_order_intents_product_line_chk;

alter table public.global_course_order_intents
  add constraint global_course_order_intents_product_line_chk check (
    (product_line = 'global_course' and course_id is not null and tiered_target_id is null)
    or (product_line = 'tiered_bundle' and course_id is null and tiered_target_id is not null)
    or (product_line = 'tiered_course_variant' and course_id is null and tiered_target_id is not null)
  );

create index if not exists idx_global_course_order_intents_tiered_reuse
  on public.global_course_order_intents (user_id, college_id, product_line, tiered_target_id, status)
  where product_line <> 'global_course' and tiered_target_id is not null;

create index if not exists idx_global_course_order_intents_product_line_paid
  on public.global_course_order_intents (product_line, status, paid_at desc)
  where product_line <> 'global_course';

create unique index if not exists idx_tiered_entitlements_purchase_order_intent_unique
  on public.tiered_entitlements (source_ref_id)
  where source_type = 'purchase';

comment on index public.idx_tiered_entitlements_purchase_order_intent_unique is
  'One purchase-sourced entitlement per finalized order intent (idempotency).';
