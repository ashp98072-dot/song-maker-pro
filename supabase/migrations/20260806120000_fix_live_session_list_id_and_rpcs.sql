-- Fix live session create failures on production:
-- 1) list_id was UUID but clients send local Date.now() ids → 400
-- 2) activate_live_session / upsert RPCs may be missing → 404
-- Run in Supabase SQL Editor if migrations were not applied.

-- Allow non-UUID list ids (local lists) while keeping UUID cloud ids as text.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'live_sessions'
      AND column_name = 'list_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.live_sessions
      ALTER COLUMN list_id TYPE text USING list_id::text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_activate_director_live_session(p_payload jsonb)
RETURNS public.live_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.live_sessions;
  v_uid uuid := auth.uid();
  v_code text := upper(trim(p_payload->>'code'));
  v_list_id text := NULLIF(trim(p_payload->>'list_id'), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'invalid session code';
  END IF;

  -- Only one active session per director.
  UPDATE public.live_sessions
  SET
    is_active = false,
    updated_at = now()
  WHERE director_id = v_uid
    AND is_active = true
    AND code <> v_code;

  INSERT INTO public.live_sessions (
    code,
    director_id,
    song_id,
    list_song_ids,
    semitones,
    bpm,
    current_key,
    is_active,
    view_mode,
    gender_shift,
    current_index,
    list_id,
    shared_section_anchor,
    follow_director,
    session_origin,
    updated_at
  ) VALUES (
    v_code,
    v_uid,
    NULLIF(p_payload->>'song_id', ''),
    COALESCE(p_payload->'list_song_ids', '[]'::jsonb),
    COALESCE((p_payload->>'semitones')::integer, 0),
    NULLIF(p_payload->>'bpm', '')::integer,
    NULLIF(p_payload->>'current_key', ''),
    true,
    COALESCE(NULLIF(p_payload->>'view_mode', ''), 'musician'),
    NULLIF(p_payload->>'gender_shift', ''),
    COALESCE((p_payload->>'current_index')::integer, 0),
    v_list_id,
    NULLIF(p_payload->>'shared_section_anchor', ''),
    COALESCE((p_payload->>'follow_director')::boolean, true),
    p_payload->'session_origin',
    now()
  )
  ON CONFLICT (code) DO UPDATE SET
    song_id = EXCLUDED.song_id,
    list_song_ids = EXCLUDED.list_song_ids,
    semitones = EXCLUDED.semitones,
    bpm = EXCLUDED.bpm,
    current_key = EXCLUDED.current_key,
    is_active = true,
    view_mode = EXCLUDED.view_mode,
    gender_shift = EXCLUDED.gender_shift,
    current_index = EXCLUDED.current_index,
    list_id = EXCLUDED.list_id,
    shared_section_anchor = EXCLUDED.shared_section_anchor,
    follow_director = EXCLUDED.follow_director,
    session_origin = COALESCE(EXCLUDED.session_origin, live_sessions.session_origin),
    updated_at = now()
  WHERE live_sessions.director_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.code IS NULL THEN
    UPDATE public.live_sessions
    SET is_active = true, updated_at = now()
    WHERE code = v_code AND director_id = v_uid
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_activate_director_live_session(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_activate_director_live_session(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_live_session(p_code text)
RETURNS public.live_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.live_sessions;
  v_uid uuid := auth.uid();
  v_code text := upper(trim(p_code));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'activate_live_session requires authenticated user';
  END IF;

  UPDATE public.live_sessions
  SET
    is_active = true,
    updated_at = now()
  WHERE code = v_code
    AND director_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_live_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_live_session(text) TO authenticated;
