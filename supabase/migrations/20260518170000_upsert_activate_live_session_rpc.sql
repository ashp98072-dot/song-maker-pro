-- Full upsert + is_active=true via SECURITY DEFINER (primary path when client RLS blocks writes).

DROP FUNCTION IF EXISTS public.upsert_activate_director_live_session(jsonb);

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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'upsert_activate_director_live_session requires authenticated user';
  END IF;

  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'invalid session code';
  END IF;

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
    NULLIF(p_payload->>'list_id', ''),
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

COMMENT ON FUNCTION public.upsert_activate_director_live_session(jsonb) IS
  'Director-only: upsert live_sessions row with is_active=true (SECURITY DEFINER).';

-- Reinforce activate_live_session (idempotent).
DROP FUNCTION IF EXISTS public.activate_live_session(text);

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

COMMENT ON FUNCTION public.activate_live_session(text) IS
  'Director-only: sets is_active=true on their live_sessions row (SECURITY DEFINER).';
