-- LMS transactional emails: outbox, invoices, secure download tokens.

begin;

-- ---------------------------------------------------------------------------
-- lms_email_outbox
-- ---------------------------------------------------------------------------
create table if not exists public.lms_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('google_welcome', 'payment_confirmation', 'batch_enrollment_success')),
  user_id uuid references auth.users (id) on delete set null,
  student_id uuid references public.students (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  invoice_id uuid,
  to_email text not null,
  subject text not null,
  html_body text not null,
  text_body text not null,
  category text not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  provider text,
  provider_message_id text,
  idempotency_key text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lms_email_outbox_idempotency_key_unique unique (idempotency_key)
);

create index if not exists idx_lms_email_outbox_status_next_attempt
  on public.lms_email_outbox (status, next_attempt_at);

create index if not exists idx_lms_email_outbox_order_id on public.lms_email_outbox (order_id);
create index if not exists idx_lms_email_outbox_user_id on public.lms_email_outbox (user_id);
create index if not exists idx_lms_email_outbox_student_id on public.lms_email_outbox (student_id);
create index if not exists idx_lms_email_outbox_created_at_desc on public.lms_email_outbox (created_at desc);

alter table public.lms_email_outbox enable row level security;

create policy lms_email_outbox_select_own
  on public.lms_email_outbox
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.lms_email_outbox from anon, authenticated;

-- ---------------------------------------------------------------------------
-- lms_invoices
-- ---------------------------------------------------------------------------
create table if not exists public.lms_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  invoice_number text not null unique,
  invoice_financial_year text not null,
  user_id uuid references auth.users (id) on delete set null,
  student_id uuid references public.students (id) on delete set null,
  purchaser_email text not null,
  purchaser_name text,
  currency text not null default 'INR',
  subtotal_minor integer not null default 0,
  discount_minor integer not null default 0,
  taxable_value_minor integer not null default 0,
  tax_rate_bps integer not null default 0,
  cgst_minor integer not null default 0,
  sgst_minor integer not null default 0,
  igst_minor integer not null default 0,
  total_minor integer not null default 0,
  place_of_supply text,
  supplier_snapshot jsonb not null default '{}'::jsonb,
  customer_snapshot jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'issued' check (status in ('issued', 'void')),
  pdf_storage_path text,
  html_snapshot text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lms_invoices_purchaser_email on public.lms_invoices (purchaser_email);
create index if not exists idx_lms_invoices_user_id on public.lms_invoices (user_id);
create index if not exists idx_lms_invoices_student_id on public.lms_invoices (student_id);
create index if not exists idx_lms_invoices_issued_at_desc on public.lms_invoices (issued_at desc);

alter table public.lms_invoices enable row level security;

create policy lms_invoices_select_own
  on public.lms_invoices
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.lms_invoices from anon, authenticated;

alter table public.lms_email_outbox
  drop constraint if exists lms_email_outbox_invoice_id_fkey;

alter table public.lms_email_outbox
  add constraint lms_email_outbox_invoice_id_fkey
  foreign key (invoice_id) references public.lms_invoices (id) on delete set null;

-- ---------------------------------------------------------------------------
-- lms_invoice_download_tokens
-- ---------------------------------------------------------------------------
create table if not exists public.lms_invoice_download_tokens (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.lms_invoices (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_lms_invoice_download_tokens_invoice_id
  on public.lms_invoice_download_tokens (invoice_id);

create index if not exists idx_lms_invoice_download_tokens_expires_at
  on public.lms_invoice_download_tokens (expires_at);

alter table public.lms_invoice_download_tokens enable row level security;

revoke all on public.lms_invoice_download_tokens from anon, authenticated;

-- updated_at triggers
create or replace function public.set_lms_transactional_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lms_email_outbox_updated_at on public.lms_email_outbox;
create trigger trg_lms_email_outbox_updated_at
  before update on public.lms_email_outbox
  for each row execute function public.set_lms_transactional_updated_at();

drop trigger if exists trg_lms_invoices_updated_at on public.lms_invoices;
create trigger trg_lms_invoices_updated_at
  before update on public.lms_invoices
  for each row execute function public.set_lms_transactional_updated_at();

commit;
