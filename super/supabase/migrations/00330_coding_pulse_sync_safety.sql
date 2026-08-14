-- Migration 00332: Coding Pulse Atomic Persistence, Concurrency Safety and Account Versioning
--
-- Authoritative Owner: SuperAdmin Repository
-- Status: CREATED BUT NOT APPLIED
-- Note: Do NOT execute during LMS runtime. This migration will be reviewed and applied manually.

-- 1. Ensure existing student_platform_metadata table exists and add account_version column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_platform_metadata'
  ) THEN
    RAISE EXCEPTION 'Required table public.student_platform_metadata does not exist.';
  END IF;
END $$;

ALTER TABLE public.student_platform_metadata
  ADD COLUMN IF NOT EXISTS account_version integer NOT NULL DEFAULT 1;

-- 2. Verify / Ensure table constraints after checking for duplicates
DO $$
BEGIN
  -- Detect duplicates on student_platform_daily_activities
  IF EXISTS (
    SELECT student_id, date, platform
    FROM public.student_platform_daily_activities
    GROUP BY student_id, date, platform
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate records detected in public.student_platform_daily_activities before adding unique constraint.';
  END IF;

  -- Deterministic column attnum comparison for UNIQUE (student_id, date, platform)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.student_platform_daily_activities'::regclass
      AND contype IN ('u', 'p')
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_platform_daily_activities'::regclass AND attname = 'student_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_platform_daily_activities'::regclass AND attname = 'date'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_platform_daily_activities'::regclass AND attname = 'platform')
      ]
  ) THEN
    ALTER TABLE public.student_platform_daily_activities
      ADD CONSTRAINT student_platform_daily_activities_student_id_date_platform_key UNIQUE (student_id, date, platform);
  END IF;
END $$;

DO $$
BEGIN
  -- Detect duplicates on student_platform_year_sync_state
  IF EXISTS (
    SELECT student_id, platform, year
    FROM public.student_platform_year_sync_state
    GROUP BY student_id, platform, year
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate records detected in public.student_platform_year_sync_state before adding unique constraint.';
  END IF;

  -- Deterministic column attnum comparison for UNIQUE (student_id, platform, year)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.student_platform_year_sync_state'::regclass
      AND contype IN ('u', 'p')
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_platform_year_sync_state'::regclass AND attname = 'student_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_platform_year_sync_state'::regclass AND attname = 'platform'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_platform_year_sync_state'::regclass AND attname = 'year')
      ]
  ) THEN
    ALTER TABLE public.student_platform_year_sync_state
      ADD CONSTRAINT student_platform_year_sync_state_student_id_platform_year_key UNIQUE (student_id, platform, year);
  END IF;
END $$;

-- Drop any older restrictive status CHECK constraints dynamically and apply comprehensive constraint
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tc.constraint_name 
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'student_platform_year_sync_state'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'status'
  LOOP
    EXECUTE 'ALTER TABLE public.student_platform_year_sync_state DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.student_platform_year_sync_state
  ADD CONSTRAINT student_platform_year_sync_state_status_check
  CHECK (status IN ('pending', 'success', 'empty', 'failed', 'partial', 'uncached', 'not_configured'));

-- 3. Atomic RPC function for committing platform year activity with 64-bit advisory locking
CREATE OR REPLACE FUNCTION public.commit_student_platform_year_activity(
  p_student_id uuid,
  p_platform text,
  p_year integer,
  p_account_version integer,
  p_fetch_outcome text,
  p_activities jsonb DEFAULT '[]'::jsonb,
  p_account_metadata jsonb DEFAULT NULL,
  p_safe_error_code text DEFAULT NULL,
  p_safe_error_message text DEFAULT NULL,
  p_fetched_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key bigint;
  v_current_version integer;
  v_start_date date;
  v_end_date date;
  v_inserted_count integer := 0;
  v_act record;
  v_new_created_at timestamptz;
  v_new_earliest date;
  v_new_latest date;
  v_current_utc_year integer;
BEGIN
  -- 1. Explicit NULL checks for mandatory parameters
  IF p_student_id IS NULL OR p_platform IS NULL OR p_year IS NULL OR p_account_version IS NULL OR p_fetch_outcome IS NULL OR p_activities IS NULL THEN
    RAISE EXCEPTION 'p_student_id, p_platform, p_year, p_account_version, p_fetch_outcome and p_activities parameters must not be NULL';
  END IF;

  -- 2. Validate inputs
  IF p_platform NOT IN ('github', 'leetcode', 'codeforces', 'gfg') THEN
    RAISE EXCEPTION 'Invalid platform parameter: %', p_platform;
  END IF;

  v_current_utc_year := EXTRACT(YEAR FROM (now() AT TIME ZONE 'UTC'))::integer;
  IF p_year < 2000 OR p_year > (v_current_utc_year + 1) THEN
    RAISE EXCEPTION 'Invalid year parameter: %', p_year;
  END IF;

  IF jsonb_typeof(p_activities) != 'array' THEN
    RAISE EXCEPTION 'p_activities parameter must be a non-null JSON array, got: %', jsonb_typeof(p_activities);
  END IF;

  -- 3. 64-bit Advisory transaction lock using hashtextextended
  v_lock_key := hashtextextended(p_student_id::text || ':' || p_platform || ':' || p_year::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 4. Select active metadata row FOR UPDATE and compare using IS DISTINCT FROM
  SELECT account_version INTO v_current_version
  FROM public.student_platform_metadata
  WHERE student_id = p_student_id AND platform = p_platform
  FOR UPDATE;

  IF v_current_version IS NULL OR v_current_version IS DISTINCT FROM p_account_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'stale_account',
      'committed', false,
      'error', 'Account version mismatch or account unlinked'
    );
  END IF;

  v_start_date := (p_year::text || '-01-01')::date;
  v_end_date := (p_year::text || '-12-31')::date;

  -- 5. Outcome & Activity Payload Strict Validation
  IF p_fetch_outcome = 'success' AND jsonb_array_length(p_activities) = 0 THEN
    RAISE EXCEPTION 'Fetch outcome success requires at least 1 activity record. Use outcome empty for 0 activities.';
  END IF;

  IF p_fetch_outcome = 'empty' AND jsonb_array_length(p_activities) > 0 THEN
    RAISE EXCEPTION 'Fetch outcome empty cannot contain activity records.';
  END IF;

  IF jsonb_array_length(p_activities) > 0 THEN
    FOR v_act IN SELECT * FROM jsonb_to_recordset(p_activities) AS x(
      date date,
      activity_count integer,
      points integer
    )
    LOOP
      IF v_act.date IS NULL THEN
        RAISE EXCEPTION 'Activity record date cannot be NULL';
      END IF;

      IF EXTRACT(YEAR FROM v_act.date) != p_year THEN
        RAISE EXCEPTION 'Activity date % does not belong to requested year %', v_act.date, p_year;
      END IF;
    END LOOP;
  END IF;

  -- 6. Handle success or empty outcomes with atomic activity replacement
  IF p_fetch_outcome IN ('success', 'empty') THEN
    DELETE FROM public.student_platform_daily_activities
    WHERE student_id = p_student_id
      AND platform = p_platform
      AND date >= v_start_date
      AND date <= v_end_date;

    IF p_fetch_outcome = 'success' AND jsonb_array_length(p_activities) > 0 THEN
      FOR v_act IN SELECT * FROM jsonb_to_recordset(p_activities) AS x(
        date date,
        activity_count integer,
        points integer
      )
      LOOP
        INSERT INTO public.student_platform_daily_activities (
          student_id, date, platform, activity_count, points, updated_at
        ) VALUES (
          p_student_id, v_act.date, p_platform, GREATEST(0, COALESCE(v_act.activity_count, 0)), GREATEST(0, COALESCE(v_act.points, 0)), now()
        )
        ON CONFLICT (student_id, date, platform)
        DO UPDATE SET
          activity_count = EXCLUDED.activity_count,
          points = EXCLUDED.points,
          updated_at = now();

        v_inserted_count := v_inserted_count + 1;
      END LOOP;
    END IF;

    INSERT INTO public.student_platform_year_sync_state (
      student_id, platform, year, status, activity_count, last_error, fetched_at, updated_at
    ) VALUES (
      p_student_id, p_platform, p_year, p_fetch_outcome, v_inserted_count, NULL, p_fetched_at, now()
    )
    ON CONFLICT (student_id, platform, year)
    DO UPDATE SET
      status = EXCLUDED.status,
      activity_count = EXCLUDED.activity_count,
      last_error = NULL,
      fetched_at = EXCLUDED.fetched_at,
      updated_at = now();

    -- Safe metadata dates update using LEAST and GREATEST
    IF p_account_metadata IS NOT NULL THEN
      v_new_created_at := (p_account_metadata->>'account_created_at')::timestamptz;
      v_new_earliest := (p_account_metadata->>'earliest_activity_date')::date;
      v_new_latest := (p_account_metadata->>'latest_activity_date')::date;

      UPDATE public.student_platform_metadata
      SET
        account_created_at = CASE
          WHEN account_created_at IS NULL THEN v_new_created_at
          WHEN v_new_created_at IS NULL THEN account_created_at
          ELSE LEAST(account_created_at, v_new_created_at)
        END,
        earliest_activity_date = CASE
          WHEN earliest_activity_date IS NULL THEN v_new_earliest
          WHEN v_new_earliest IS NULL THEN earliest_activity_date
          ELSE LEAST(earliest_activity_date, v_new_earliest)
        END,
        latest_activity_date = CASE
          WHEN latest_activity_date IS NULL THEN v_new_latest
          WHEN v_new_latest IS NULL THEN latest_activity_date
          ELSE GREATEST(latest_activity_date, v_new_latest)
        END,
        updated_at = now()
      WHERE student_id = p_student_id AND platform = p_platform;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'status', p_fetch_outcome,
      'committed', true,
      'activity_count', v_inserted_count
    );

  -- 7. Handle error outcomes: DO NOT delete previously valid activity
  ELSIF p_fetch_outcome IN ('failed', 'retryable_error', 'non_retryable_error') THEN
    INSERT INTO public.student_platform_year_sync_state (
      student_id, platform, year, status, activity_count, last_error, fetched_at, updated_at
    ) VALUES (
      p_student_id, p_platform, p_year, 'failed', 0, COALESCE(p_safe_error_message, 'Provider fetch failed'), p_fetched_at, now()
    )
    ON CONFLICT (student_id, platform, year)
    DO UPDATE SET
      status = 'failed',
      last_error = EXCLUDED.last_error,
      fetched_at = EXCLUDED.fetched_at,
      updated_at = now();

    RETURN jsonb_build_object(
      'success', true,
      'status', 'failed',
      'committed', false,
      'retained_previous_activity', true,
      'error_code', p_safe_error_code,
      'error', p_safe_error_message
    );

  -- 8. Handle ONLY explicit partial outcome
  ELSIF p_fetch_outcome = 'partial' THEN
    INSERT INTO public.student_platform_year_sync_state (
      student_id, platform, year, status, activity_count, last_error, fetched_at, updated_at
    ) VALUES (
      p_student_id, p_platform, p_year, 'partial', 0, COALESCE(p_safe_error_message, 'Partial data returned'), p_fetched_at, now()
    )
    ON CONFLICT (student_id, platform, year)
    DO UPDATE SET
      status = 'partial',
      last_error = EXCLUDED.last_error,
      fetched_at = EXCLUDED.fetched_at,
      updated_at = now();

    RETURN jsonb_build_object(
      'success', true,
      'status', 'partial',
      'committed', false,
      'retained_previous_activity', true,
      'error_code', p_safe_error_code
    );

  -- 9. Reject any unknown outcome
  ELSE
    RAISE EXCEPTION 'Unknown or unsupported fetch outcome: %', p_fetch_outcome;
  END IF;
END;
$$;

-- 4. Security Hardening: Revoke PUBLIC execute and grant execute to service_role only
REVOKE EXECUTE ON FUNCTION public.commit_student_platform_year_activity FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_student_platform_year_activity FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_student_platform_year_activity FROM authenticated;
GRANT EXECUTE ON FUNCTION public.commit_student_platform_year_activity TO service_role;
