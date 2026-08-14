-- Single Session Enforcement: active_sessions table
-- Only one active session per user at any time.
-- Run this in Supabase SQL Editor or via `supabase db push`.

CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_info  TEXT
);

-- Enable Realtime so row changes are broadcast instantly to subscribed clients
ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;

-- Row Level Security
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own row (for the realtime filter to work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'active_sessions' 
      AND policyname = 'Users can read own active session'
  ) THEN
    CREATE POLICY "Users can read own active session"
      ON public.active_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;
