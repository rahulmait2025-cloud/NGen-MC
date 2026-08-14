-- ============================================================
-- 00172: Move pg_trgm extension out of public schema
-- Security fix - part 6
-- ============================================================

begin;

create extension if not exists pg_trgm schema extensions;

commit;