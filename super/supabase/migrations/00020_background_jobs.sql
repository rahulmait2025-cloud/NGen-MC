-- ============================================================
-- 00020_background_jobs.sql
-- Background Jobs Framework: jobs, job_attempts, job_schedules
-- ============================================================

-- Job states
CREATE TYPE job_state AS ENUM ('pending', 'running', 'success', 'failed', 'dead');

-- Job types
CREATE TYPE job_type AS ENUM (
  'refresh_kpi_views',
  'generate_analytics_snapshot',
  'send_email',
  'retry_failed_emails',
  'compute_readiness_scores',
  'recalculate_assessment_analytics',
  'sync_content_metrics',
  'archive_old_notifications',
  'cleanup_expired_tokens',
  'security_audit'
);

-- ─── jobs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type             job_type NOT NULL,
  payload          jsonb NOT NULL DEFAULT '{}',
  state            job_state NOT NULL DEFAULT 'pending',
  priority         integer NOT NULL DEFAULT 0,           -- higher = run first
  attempt_count    integer NOT NULL DEFAULT 0,
  max_attempts     integer NOT NULL DEFAULT 3,
  next_run_at      timestamptz NOT NULL DEFAULT now(),
  last_attempt_at  timestamptz,
  completed_at     timestamptz,
  enqueued_by      uuid REFERENCES auth.users(id),
  tenant_id        uuid,                                 -- null = platform-wide
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── job_attempts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  attempt_number  integer NOT NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  duration_ms     integer,
  state           job_state NOT NULL DEFAULT 'running',  -- outcome of THIS attempt
  failure_reason  text,
  worker_id       text,                                  -- process/instance identifier
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── job_schedules ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type         job_type NOT NULL UNIQUE,
  interval_minutes integer NOT NULL DEFAULT 60,
  enabled          boolean NOT NULL DEFAULT true,
  last_enqueued_at timestamptz,
  next_enqueue_at  timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_state_next_run    ON jobs (state, next_run_at) WHERE state IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_jobs_type              ON jobs (type);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant            ON jobs (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_attempts_job_id    ON job_attempts (job_id);
CREATE INDEX IF NOT EXISTS idx_job_schedules_next     ON job_schedules (next_enqueue_at) WHERE enabled = true;

-- ─── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_job_schedules_updated_at ON job_schedules;
CREATE TRIGGER trg_job_schedules_updated_at BEFORE UPDATE ON job_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Helper: claim next pending job atomically ────────────────
CREATE OR REPLACE FUNCTION claim_next_job(p_worker_id text)
RETURNS SETOF jobs
LANGUAGE plpgsql AS $$
DECLARE
  v_job_id uuid;
  v_row jobs%ROWTYPE;
BEGIN
  -- Lock a single pending job that is due, prioritised by priority DESC then created_at ASC
  SELECT id INTO v_job_id
  FROM public.jobs
  WHERE state IN ('pending', 'failed')
    AND next_run_at <= now()
    AND attempt_count < max_attempts
  ORDER BY priority DESC, next_run_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.jobs
  SET
    state           = 'running',
    attempt_count   = attempt_count + 1,
    last_attempt_at = now(),
    updated_at      = now()
  WHERE id = v_job_id
  RETURNING * INTO STRICT v_row;

  RETURN NEXT v_row;
END;
$$;

-- ─── Default schedules ───────────────────────────────────────
INSERT INTO job_schedules (job_type, interval_minutes, enabled)
VALUES
  ('refresh_kpi_views',               60,   true),
  ('generate_analytics_snapshot',     360,  true),
  ('send_email',                      5,    true),
  ('retry_failed_emails',             30,   true),
  ('compute_readiness_scores',        120,  true),
  ('recalculate_assessment_analytics',60,   true),
  ('sync_content_metrics',            120,  true),
  ('archive_old_notifications',       1440, true),
  ('cleanup_expired_tokens',          720,  true),
  ('security_audit',                  360,  true)
ON CONFLICT (job_type) DO NOTHING;

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_schedules ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; all direct app queries use service role.
-- SuperAdmin UI reads via service role only — no user-level RLS needed.
-- Re-enable below if a public API is ever exposed.

CREATE POLICY "service_role_all_jobs"         ON jobs          FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all_job_attempts" ON job_attempts  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all_job_schedules"ON job_schedules FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
