-- Add active_sessions to the Supabase Realtime publication.
-- Without this, Postgres WAL changes are NOT broadcast to Realtime subscribers,
-- even though REPLICA IDENTITY FULL is set (that only controls which columns
-- appear in the WAL, not whether Realtime picks them up).

DO $$
BEGIN
  -- Only add if not already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'active_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
    RAISE NOTICE 'active_sessions added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'active_sessions already in supabase_realtime publication';
  END IF;
END
$$;
