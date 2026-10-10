-- Canonical corrections are independent of personal copies and uploader ownership.
CREATE TABLE IF NOT EXISTS public.catalog_song_corrections (
  song_id text PRIMARY KEY,
  chords text NOT NULL CHECK (length(btrim(chords)) BETWEEN 1 AND 100000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_song_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_song_corrections FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.catalog_song_corrections_read(p_offset integer DEFAULT 0)
RETURNS TABLE(song_id text, chords text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT c.song_id, c.chords FROM public.catalog_song_corrections c
  ORDER BY c.song_id LIMIT 500 OFFSET greatest(coalesce(p_offset, 0), 0) $$;
REVOKE ALL ON FUNCTION public.catalog_song_corrections_read(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_song_corrections_read(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_correct_catalog_song(p_song_id text, p_chords text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'
  ) THEN RAISE EXCEPTION 'Solo el administrador puede corregir el catálogo' USING ERRCODE = '42501'; END IF;
  IF coalesce(length(btrim(p_song_id)), 0) NOT BETWEEN 1 AND 200
    OR coalesce(length(btrim(p_chords)), 0) NOT BETWEEN 1 AND 100000
  THEN RAISE EXCEPTION 'Canción o corrección inválida'; END IF;
  INSERT INTO public.catalog_song_corrections(song_id, chords) VALUES(p_song_id, p_chords)
  ON CONFLICT(song_id) DO UPDATE SET chords = EXCLUDED.chords, updated_at = now();
  -- Community readers also receive the correction, without transferring ownership.
  UPDATE public.public_songs SET chords = p_chords, updated_at = now() WHERE song_id = p_song_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_correct_catalog_song(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_correct_catalog_song(text, text) TO authenticated;
