-- Deactivate all active live_sessions for the authenticated director (ghost session cleanup).

DROP FUNCTION IF EXISTS public.deactivate_director_live_sessions(text);

CREATE OR REPLACE FUNCTION public.deactivate_director_live_sessions(p_keep_code text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
  v_keep text := NULLIF(upper(trim(p_keep_code)), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  UPDATE public.live_sessions
  SET
    is_active = false,
    updated_at = now()
  WHERE director_id = v_uid
    AND is_active = true
    AND (v_keep IS NULL OR code <> v_keep);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_director_live_sessions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_director_live_sessions(text) TO authenticated;

COMMENT ON FUNCTION public.deactivate_director_live_sessions(text) IS
  'Director-only: sets is_active=false on all active live_sessions rows except optional keep code.';
