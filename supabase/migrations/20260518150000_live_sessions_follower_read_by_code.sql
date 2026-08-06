-- Followers (including anon) must read active live_sessions by join code.
-- Table RLS previously allowed SELECT only TO authenticated.

-- Permissive read for active sessions (join / sync / overlay fallback).
DROP POLICY IF EXISTS "ls_select_active_for_followers" ON public.live_sessions;

CREATE POLICY "ls_select_active_for_followers"
  ON public.live_sessions
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

COMMENT ON POLICY "ls_select_active_for_followers" ON public.live_sessions IS
  'Followers read only active director sessions (by code) without owning the row.';

-- SECURITY DEFINER RPC: reliable read when client RLS still returns zero rows.
DROP FUNCTION IF EXISTS public.get_live_session_by_code(text);

CREATE OR REPLACE FUNCTION public.get_live_session_by_code(p_code text)
RETURNS SETOF public.live_sessions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.live_sessions
  WHERE upper(trim(code)) = upper(trim(p_code))
    AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_live_session_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_session_by_code(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_live_session_by_code(text) IS
  'Returns the newest active live_sessions row for a join code (followers / overlay sync).';
