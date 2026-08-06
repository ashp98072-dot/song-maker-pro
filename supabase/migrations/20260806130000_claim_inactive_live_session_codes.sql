-- Claim abandoned (inactive) session codes on director create, and always flip is_active=true.
-- Fixes join failures where a row exists with is_active=false after ghost cleanup races.

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
    director_id = v_uid,
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
  -- Own rows always; orphan inactive codes can be claimed.
  WHERE live_sessions.director_id = v_uid
     OR live_sessions.is_active = false
  RETURNING * INTO v_row;

  IF v_row.code IS NULL THEN
    UPDATE public.live_sessions
    SET
      director_id = v_uid,
      is_active = true,
      song_id = COALESCE(NULLIF(p_payload->>'song_id', ''), song_id),
      updated_at = now()
    WHERE code = v_code
      AND (director_id = v_uid OR is_active = false)
    RETURNING * INTO v_row;
  END IF;

  IF v_row.code IS NULL THEN
    RAISE EXCEPTION 'session code % is already active by another director', v_code;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_activate_director_live_session(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_activate_director_live_session(jsonb) TO authenticated;
