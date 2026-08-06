-- SECURITY DEFINER: director can force is_active=true when client UPDATE is blocked by RLS edge cases.

DROP FUNCTION IF EXISTS public.activate_live_session(text);

CREATE OR REPLACE FUNCTION public.activate_live_session(p_code text)
RETURNS public.live_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.live_sessions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'activate_live_session requires authenticated user';
  END IF;

  UPDATE public.live_sessions
  SET
    is_active = true,
    updated_at = now()
  WHERE upper(trim(code)) = upper(trim(p_code))
    AND director_id = auth.uid()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_live_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_live_session(text) TO authenticated;

COMMENT ON FUNCTION public.activate_live_session(p_code text) IS
  'Director-only: sets is_active=true on their live_sessions row (bypasses client RLS UPDATE quirks).';
