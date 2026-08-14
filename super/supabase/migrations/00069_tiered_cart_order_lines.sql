-- Phase 2: multi-item tiered cart — normalized lines under global_course_order_intents.
-- Parent intent uses product_line = 'tiered_cart'; per-line product_line is tiered_bundle | tiered_course_variant.

alter table public.global_course_order_intents
  drop constraint if exists global_course_order_intents_product_line_chk;

alter table public.global_course_order_intents
  add constraint global_course_order_intents_product_line_chk check (
    (product_line = 'global_course' and course_id is not null and tiered_target_id is null)
    or (product_line = 'tiered_bundle' and course_id is null and tiered_target_id is not null)
    or (product_line = 'tiered_course_variant' and course_id is null and tiered_target_id is not null)
    or (product_line = 'tiered_cart' and course_id is null and tiered_target_id is null)
  );

comment on column public.global_course_order_intents.product_line is
  'global_course | tiered_bundle | tiered_course_variant | tiered_cart — cart uses tiered_cart with rows in global_course_order_intent_lines.';

create table if not exists public.global_course_order_intent_lines (
  id uuid primary key default gen_random_uuid(),
  order_intent_id uuid not null references public.global_course_order_intents (id) on delete cascade,
  product_line text not null,
  tiered_target_id uuid not null,
  amount_minor integer not null,
  currency_code text not null,
  sort_order integer not null default 0,
  line_snapshot jsonb,
  created_at timestamptz not null default now(),
  constraint global_course_order_intent_lines_product_line_chk check (
    product_line in ('tiered_bundle', 'tiered_course_variant')
  ),
  constraint global_course_order_intent_lines_amount_chk check (amount_minor >= 0),
  constraint global_course_order_intent_lines_unique_item unique (order_intent_id, product_line, tiered_target_id)
);

comment on table public.global_course_order_intent_lines is
  'Tiered cart line items; entitlement source_ref_id may reference line id (purchase) for idempotency per line.';

create index if not exists idx_global_course_order_intent_lines_intent
  on public.global_course_order_intent_lines (order_intent_id, sort_order);

alter table public.global_course_order_intent_lines enable row level security;

drop policy if exists "Superadmin full access global_course_order_intent_lines" on public.global_course_order_intent_lines;
create policy "Superadmin full access global_course_order_intent_lines"
on public.global_course_order_intent_lines for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read own global_course_order_intent_lines" on public.global_course_order_intent_lines;
create policy "Students can read own global_course_order_intent_lines"
on public.global_course_order_intent_lines for select
using (
  exists (
    select 1
    from public.global_course_order_intents o
    where o.id = order_intent_id
      and (
        o.user_id = auth.uid()
        or o.student_id in (
          select s.id from public.students s where s.user_id = auth.uid()
        )
      )
  )
);

grant select on public.global_course_order_intent_lines to authenticated;
