-- ============================================================
-- 00173: Add grants for utility functions
-- Security fix - part 7
-- ============================================================

begin;

grant execute on function public.get_active_price_plans(uuid) to authenticated;
grant execute on function public.rate_limit_consume(text, integer) to authenticated;
grant execute on function public.get_email_event_counts(uuid) to authenticated;

-- Conditional grant using dynamic SQL to avoid parse-time check
do $$
begin
  if exists (select 1 from pg_proc where proname = 'check_college_lead_duplicate' and pronamespace = (select oid from pg_namespace where nspname = 'public')) then
    execute 'grant execute on function public.check_college_lead_duplicate() to authenticated';
  end if;
end $$;

commit;

-- ============================================================
-- POST-MIGRATION NOTES
-- ============================================================
-- 1. auth_leaked_password_protection must be enabled in Supabase Dashboard:
--    Authentication > Providers > Advanced > Leaked Password Protection: Enable
-- ============================================================