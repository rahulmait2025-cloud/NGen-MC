-- Migration 00328: Student Profile Usernames (Phase 1)
-- Public username foundation for shareable student coding profiles.

BEGIN;

-- 1. Safely enable citext extension in extensions schema
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- 2. Add username and username_set columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username extensions.citext,
  ADD COLUMN IF NOT EXISTS username_set boolean NOT NULL DEFAULT false;

-- 3. Username generation function
CREATE OR REPLACE FUNCTION public.generate_student_username(
  p_email text,
  p_user_id uuid,
  p_take_lock boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_raw_prefix text;
  v_clean_prefix text;
  v_uuid_hex text;
  v_base text;
  v_candidate text;
  v_counter integer := 0;
  v_suffix text;
  v_max_base_len integer;
  v_exists boolean;
BEGIN
  -- Extract prefix before '@' and remove '+alias'
  IF p_email IS NOT NULL AND p_email LIKE '%@%' THEN
    v_raw_prefix := split_part(p_email, '@', 1);
    v_raw_prefix := split_part(v_raw_prefix, '+', 1);
  ELSE
    v_raw_prefix := '';
  END IF;

  -- Lowercase and replace groups of invalid chars [^a-z0-9_]+ with '_'
  v_clean_prefix := lower(v_raw_prefix);
  v_clean_prefix := regexp_replace(v_clean_prefix, '[^a-z0-9_]+', '_', 'g');
  
  -- Trim leading and trailing underscores
  v_clean_prefix := trim(both '_' from v_clean_prefix);

  v_uuid_hex := lower(replace(p_user_id::text, '-', ''));

  -- Check length requirement (4-20 chars)
  IF char_length(v_clean_prefix) < 4 THEN
    IF char_length(v_clean_prefix) = 0 THEN
      -- Fallback if prefix is empty or unusable: user_<uuid_suffix>
      v_base := substring('user_' || v_uuid_hex from 1 for 20);
    ELSE
      -- Short prefix (1-3 chars): <prefix>_<uuid_suffix>
      v_base := substring(v_clean_prefix || '_' || v_uuid_hex from 1 for 20);
    END IF;
  ELSE
    -- Truncate to 20 chars max
    v_base := substring(v_clean_prefix from 1 for 20);
    -- Trim trailing underscores if truncation left any
    v_base := trim(trailing '_' from v_base);
    IF char_length(v_base) < 4 THEN
      v_base := substring(v_base || '_' || v_uuid_hex from 1 for 20);
    END IF;
  END IF;

  -- Disambiguate collisions
  v_candidate := v_base;
  LOOP
    IF p_take_lock THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(lower(v_candidate), 0));
    END IF;
    
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE username = v_candidate
    ) INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_candidate;
    END IF;

    v_counter := v_counter + 1;
    v_suffix := '_' || v_counter::text;
    v_max_base_len := 20 - char_length(v_suffix);
    v_candidate := substring(v_base from 1 for v_max_base_len) || v_suffix;
  END LOOP;
END;
$$;

-- 4. BEFORE INSERT trigger function to default username for new profiles
CREATE OR REPLACE FUNCTION public.set_default_student_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := public.generate_student_username(NEW.email, NEW.id, true);
    NEW.username_set := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_default_student_username ON public.profiles;

CREATE TRIGGER trigger_set_default_student_username
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_student_username();

-- 5. Deterministic backfill of existing profiles where username IS NULL
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, email FROM public.profiles WHERE username IS NULL ORDER BY created_at ASC, id ASC LOOP
    UPDATE public.profiles
    SET username = public.generate_student_username(r.email, r.id, false),
        username_set = false
    WHERE id = r.id AND username IS NULL;
  END LOOP;
END;
$$;

-- 6. Enforce NOT NULL constraint on username after backfill
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

-- 7. Format check constraint (4-20 chars, lowercase letters, numbers, underscores)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_check
  CHECK (
    char_length(username::text) BETWEEN 4 AND 20
    AND username::text = lower(username::text)
    AND username::text ~ '^[a-z0-9_]+$'
  );

-- 8. Case-insensitive unique constraint / index
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_key;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- 9. Database immutability trigger function (one-time username set & enforcement)
CREATE OR REPLACE FUNCTION public.prevent_student_username_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- A confirmed username can never be modified.
  IF OLD.username_set = true
     AND NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'Username is immutable once set.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Confirmation status cannot be reverted.
  IF OLD.username_set = true
     AND NEW.username_set = false THEN
    RAISE EXCEPTION 'Username set status cannot be reverted.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Changing an autogenerated username must consume the one-time selection.
  IF OLD.username_set = false
     AND NEW.username IS DISTINCT FROM OLD.username
     AND NEW.username_set = false THEN
    RAISE EXCEPTION 'Username changes must be confirmed as the one-time selection.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_student_username_change ON public.profiles;

CREATE TRIGGER trigger_prevent_student_username_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_username_change();

-- 10. Revoke direct function execution from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION public.generate_student_username(text, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_student_username(text, uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.generate_student_username(text, uuid, boolean) FROM authenticated;

REVOKE ALL ON FUNCTION public.set_default_student_username() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_default_student_username() FROM anon;
REVOKE ALL ON FUNCTION public.set_default_student_username() FROM authenticated;

REVOKE ALL ON FUNCTION public.prevent_student_username_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_student_username_change() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_student_username_change() FROM authenticated;

COMMIT;
