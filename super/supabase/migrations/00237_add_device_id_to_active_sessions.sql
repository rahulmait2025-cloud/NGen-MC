-- Add device_id to active_sessions for device-based single session enforcement.
-- Replaces hash-based comparison (which broke multi-tab) with device-ID comparison.
-- Existing rows get empty device_id (legacy, allowed through by middleware).

ALTER TABLE public.active_sessions
ADD COLUMN IF NOT EXISTS device_id TEXT NOT NULL DEFAULT '';
