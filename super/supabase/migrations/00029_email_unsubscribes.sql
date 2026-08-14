-- Store emails that have opted out of invite/marketing emails for reputation and compliance.
-- Checked by Super Admin before sending invite; unsubscribe link in invite template points to LMS.
create table if not exists public.email_unsubscribes (
  email text not null primary key,
  unsubscribed_at timestamptz not null default now(),
  source text
);

create index if not exists idx_email_unsubscribes_email_lower on public.email_unsubscribes (lower(email));

alter table public.email_unsubscribes enable row level security;

-- Only service role can read/write (anon/auth cannot). Unsubscribe API and Super Admin use service role.
drop policy if exists "No direct anon/auth access email_unsubscribes" on public.email_unsubscribes;

create policy "No direct anon/auth access email_unsubscribes"
  on public.email_unsubscribes for all
  using (false)
  with check (false);
