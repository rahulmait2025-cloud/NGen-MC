-- Distributed rate limiting for serverless (replaces in-memory store).
-- Table stores one row per rate-limit key; function atomically increments or resets window.

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_ms int NOT NULL
);

COMMENT ON TABLE rate_limits IS 'Sliding-window rate limit counters; used by API and Server Actions.';

CREATE OR REPLACE FUNCTION rate_limit_consume(p_key text, p_window_ms int)
RETURNS TABLE (new_count int, out_window_start timestamptz, out_window_ms int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rate_limits (key, count, window_start, window_ms)
  VALUES (p_key, 1, now(), p_window_ms)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN (rate_limits.window_start + (rate_limits.window_ms || ' milliseconds')::interval) <= now() THEN 1
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN (rate_limits.window_start + (rate_limits.window_ms || ' milliseconds')::interval) <= now() THEN now()
      ELSE rate_limits.window_start
    END,
    window_ms = p_window_ms;

  RETURN QUERY
  SELECT r.count, r.window_start, r.window_ms
  FROM rate_limits r
  WHERE r.key = p_key;
END;
$$;

-- Allow only authenticated clients to use the function and table
GRANT SELECT, INSERT, UPDATE ON rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION rate_limit_consume(text, int) TO authenticated;
