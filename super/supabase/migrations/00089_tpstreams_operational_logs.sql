
-- ─── TPSTREAMS OPERATIONAL LOGS (Phase 5C) ──────────────────────────────────

-- 1. Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS public.tpstreams_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    tp_asset_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for analytics & debugging
CREATE INDEX IF NOT EXISTS idx_tpstreams_webhook_logs_asset_id ON public.tpstreams_webhook_logs(tp_asset_id);
CREATE INDEX IF NOT EXISTS idx_tpstreams_webhook_logs_received_at ON public.tpstreams_webhook_logs(received_at DESC);

-- 2. Asset Sync Audit History
CREATE TABLE IF NOT EXISTS public.tpstreams_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.master_courses(id) ON DELETE SET NULL,
    sync_type TEXT NOT NULL, -- 'manual_folder', 'manual_asset', 'webhook_auto'
    inserted_count INT DEFAULT 0,
    updated_count INT DEFAULT 0,
    missing_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for sync history
CREATE INDEX IF NOT EXISTS idx_tpstreams_sync_logs_course_id ON public.tpstreams_sync_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_tpstreams_sync_logs_started_at ON public.tpstreams_sync_logs(started_at DESC);

-- RLS
ALTER TABLE public.tpstreams_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tpstreams_sync_logs ENABLE ROW LEVEL SECURITY;

-- SuperAdmin full access (using project standard helper function)
CREATE POLICY "SuperAdmins have full access to tpstreams_webhook_logs" 
ON public.tpstreams_webhook_logs FOR ALL 
TO authenticated 
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "SuperAdmins have full access to tpstreams_sync_logs" 
ON public.tpstreams_sync_logs FOR ALL 
TO authenticated 
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Comments
COMMENT ON TABLE public.tpstreams_webhook_logs IS 'Audit trail for all incoming webhooks from TPStreams.';
COMMENT ON TABLE public.tpstreams_sync_logs IS 'Audit trail for metadata synchronization jobs between TPStreams and local DB.';
