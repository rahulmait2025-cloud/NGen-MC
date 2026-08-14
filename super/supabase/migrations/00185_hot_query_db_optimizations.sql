-- ============================================================
-- 00185: Hot Query DB Optimizations
--
-- Purpose:
--   Speed up the real hot queries visible in pg_stat_statements:
--   - resolve_student_auth_context / resolve_admin_auth_context planning
--   - resolve_login_route_context planning
--   - public college slug lookup
--   - email campaign scheduler lookup
--   - email outbox claim batch
--   - rate limit cleanup / high churn table
--   - entitlement validity / assignment expiry checks
--   - audit_logs ILIKE action search
--
-- Safety:
--   - Adds indexes only when tables/columns exist
--   - Changes only planner metadata for read-only resolver functions
--   - Does not alter RLS policies
--   - Does not drop/rename columns
--   - Does not delete business data
--   - Does not change course/payment/access rules
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Auth/login resolver planner hints
-- These functions return a single context row and are read-only.
-- This reduces planner overestimation from ROWS 1000 to ROWS 1.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure('public.resolve_student_auth_context(uuid,text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.resolve_student_auth_context(uuid, text) STABLE';
    EXECUTE 'ALTER FUNCTION public.resolve_student_auth_context(uuid, text) COST 5';
    EXECUTE 'ALTER FUNCTION public.resolve_student_auth_context(uuid, text) ROWS 1';
  END IF;

  IF to_regprocedure('public.resolve_admin_auth_context(uuid,text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) STABLE';
    EXECUTE 'ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) COST 5';
    EXECUTE 'ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) ROWS 1';
  END IF;

  IF to_regprocedure('public.resolve_login_route_context(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.resolve_login_route_context(uuid) STABLE';
    EXECUTE 'ALTER FUNCTION public.resolve_login_route_context(uuid) COST 5';
    EXECUTE 'ALTER FUNCTION public.resolve_login_route_context(uuid) ROWS 1';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 2. Public college slug lookup
-- Hot query:
--   FROM colleges WHERE slug = ? AND status = ? LIMIT 1
-- This is used by public/anon college pages.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.colleges') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'colleges'
         AND column_name IN (
           'id',
           'name',
           'slug',
           'status',
           'short_name',
           'logo_url',
           'primary_color',
           'secondary_color'
         )
       GROUP BY table_name
       HAVING count(*) = 8
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_colleges_slug_status_public_cover
      ON public.colleges (slug, status)
      INCLUDE (id, name, short_name, logo_url, primary_color, secondary_color)
    ';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 3. Email campaign scheduler lookup
-- Hot query:
--   schedule_status = scheduled
--   scheduled_at <= now()
--   last_scheduler_run_at is null
--   status = any(...)
--   approval_status = any(...)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.email_campaigns') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'email_campaigns'
         AND column_name IN (
           'id',
           'schedule_status',
           'scheduled_at',
           'last_scheduler_run_at',
           'status',
           'approval_status'
         )
       GROUP BY table_name
       HAVING count(*) = 6
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduler_ready_hot
      ON public.email_campaigns (scheduled_at, status, approval_status, id)
      WHERE schedule_status = ''scheduled''
        AND last_scheduler_run_at IS NULL
    ';

    -- Matches Supabase index advisor's basic schedule_status suggestion,
    -- but kept lightweight and safe.
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_schedule_status_hot
      ON public.email_campaigns (schedule_status)
    ';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 4. Email outbox batch claiming
-- Hot query/function:
--   claim_email_outbox_batch(...)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.email_outbox') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'email_outbox'
         AND column_name IN (
           'id',
           'status',
           'next_attempt_at',
           'attempts',
           'max_attempts',
           'locked_at',
           'created_at'
         )
       GROUP BY table_name
       HAVING count(*) = 7
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_email_outbox_claim_ready_hot
      ON public.email_outbox (status, next_attempt_at, created_at, id)
      INCLUDE (attempts, max_attempts, locked_at)
      WHERE status IN (''queued'', ''failed'')
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_email_outbox_processing_locked_hot
      ON public.email_outbox (locked_at, created_at, id)
      WHERE status = ''processing''
    ';

    EXECUTE '
      ALTER TABLE public.email_outbox SET (
        autovacuum_vacuum_scale_factor = 0.02,
        autovacuum_vacuum_threshold = 1000,
        autovacuum_analyze_scale_factor = 0.02,
        autovacuum_analyze_threshold = 1000
      )
    ';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 5. LMS transactional email outbox, if present
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.lms_email_outbox') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'lms_email_outbox'
         AND column_name IN (
           'id',
           'status',
           'next_attempt_at',
           'attempts',
           'max_attempts',
           'locked_at',
           'created_at'
         )
       GROUP BY table_name
       HAVING count(*) = 7
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_lms_email_outbox_claim_ready_hot
      ON public.lms_email_outbox (status, next_attempt_at, created_at, id)
      INCLUDE (attempts, max_attempts, locked_at)
      WHERE status IN (''queued'', ''failed'')
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_lms_email_outbox_processing_locked_hot
      ON public.lms_email_outbox (locked_at, created_at, id)
      WHERE status = ''processing''
    ';

    EXECUTE '
      ALTER TABLE public.lms_email_outbox SET (
        autovacuum_vacuum_scale_factor = 0.02,
        autovacuum_vacuum_threshold = 1000,
        autovacuum_analyze_scale_factor = 0.02,
        autovacuum_analyze_threshold = 1000
      )
    ';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 6. Rate limiter table
-- Hot query/function:
--   rate_limit_consume(...)
-- Also cleanup_expired_rate_limits() is visible in hot query list.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.rate_limits') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'rate_limits'
         AND column_name IN ('key', 'count', 'window_start', 'window_ms')
       GROUP BY table_name
       HAVING count(*) = 4
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start_hot
      ON public.rate_limits (window_start)
    ';

    EXECUTE '
      ALTER TABLE public.rate_limits SET (
        autovacuum_vacuum_scale_factor = 0.01,
        autovacuum_vacuum_threshold = 500,
        autovacuum_analyze_scale_factor = 0.02,
        autovacuum_analyze_threshold = 500
      )
    ';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 7. Entitlement validity / expiry access checks
-- Speeds:
--   status = active AND valid_until < now()
--   student active access checks
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.student_entitlements') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'student_entitlements'
         AND column_name IN ('student_id', 'status', 'source_type', 'valid_until', 'metadata')
       GROUP BY table_name
       HAVING count(*) = 5
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_student_entitlements_active_b2c_valid_until_hot
      ON public.student_entitlements (valid_until)
      WHERE status = ''active''
        AND source_type = ''b2c_direct''
        AND valid_until IS NOT NULL
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_student_entitlements_assignment_id_active_hot
      ON public.student_entitlements ((metadata->>''assignment_id''))
      WHERE status = ''active''
        AND metadata ? ''assignment_id''
    ';
  END IF;

  IF to_regclass('public.student_content_entitlements') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'student_content_entitlements'
         AND column_name IN (
           'student_id',
           'assigned_entity_type',
           'assigned_entity_id',
           'status',
           'valid_until',
           'metadata'
         )
       GROUP BY table_name
       HAVING count(*) = 6
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_student_content_entitlements_active_valid_until_hot
      ON public.student_content_entitlements (valid_until)
      WHERE status = ''active''
        AND valid_until IS NOT NULL
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_student_content_entitlements_assignment_id_active_hot
      ON public.student_content_entitlements ((metadata->>''assignment_id''))
      WHERE status = ''active''
        AND metadata ? ''assignment_id''
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_student_content_entitlements_student_status_valid_hot
      ON public.student_content_entitlements (student_id, status, valid_until)
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_student_content_entitlements_student_entity_status_valid_hot
      ON public.student_content_entitlements (
        student_id,
        assigned_entity_type,
        assigned_entity_id,
        status,
        valid_until
      )
    ';
  END IF;

  IF to_regclass('public.content_assignments') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'content_assignments'
         AND column_name IN ('status', 'end_date')
       GROUP BY table_name
       HAVING count(*) = 2
     )
  THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_content_assignments_active_end_date_hot
      ON public.content_assignments (end_date)
      WHERE status = ''active''
        AND end_date IS NOT NULL
    ';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 8. audit_logs action ILIKE search
-- Hot query:
--   audit_logs.action ILIKE ? ORDER BY created_at DESC LIMIT ?
-- GIN trigram helps ILIKE especially when pattern contains wildcards.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'audit_logs'
         AND column_name IN ('action', 'created_at')
       GROUP BY table_name
       HAVING count(*) = 2
     )
  THEN
    CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action_trgm_hot
      ON public.audit_logs
      USING gin (action extensions.gin_trgm_ops)
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc_hot
      ON public.audit_logs (created_at DESC)
    ';
  END IF;
END $$;


-- ------------------------------------------------------------
-- 9. Analyze affected tables so planner can use new indexes.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.colleges') IS NOT NULL THEN
    ANALYZE public.colleges;
  END IF;

  IF to_regclass('public.email_campaigns') IS NOT NULL THEN
    ANALYZE public.email_campaigns;
  END IF;

  IF to_regclass('public.email_outbox') IS NOT NULL THEN
    ANALYZE public.email_outbox;
  END IF;

  IF to_regclass('public.lms_email_outbox') IS NOT NULL THEN
    ANALYZE public.lms_email_outbox;
  END IF;

  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    ANALYZE public.rate_limits;
  END IF;

  IF to_regclass('public.student_entitlements') IS NOT NULL THEN
    ANALYZE public.student_entitlements;
  END IF;

  IF to_regclass('public.student_content_entitlements') IS NOT NULL THEN
    ANALYZE public.student_content_entitlements;
  END IF;

  IF to_regclass('public.content_assignments') IS NOT NULL THEN
    ANALYZE public.content_assignments;
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    ANALYZE public.audit_logs;
  END IF;
END $$;

COMMIT;
