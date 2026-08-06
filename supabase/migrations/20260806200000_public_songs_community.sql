-- Community library: genre taxonomy + public read + authenticated publish.
-- public_songs already exists in production; this extends it safely.

ALTER TABLE public.public_songs
  ADD COLUMN IF NOT EXISTS genre text NOT NULL DEFAULT 'adoracion',
  ADD COLUMN IF NOT EXISTS original_gender text NOT NULL DEFAULT 'male';

COMMENT ON COLUMN public.public_songs.genre IS
  'Curated worship genre slug (adoracion, alabanza, contemporaneo, himno, coral, juvenil, ninos, instrumental, otro).';

CREATE INDEX IF NOT EXISTS public_songs_genre_idx ON public.public_songs (genre);
CREATE INDEX IF NOT EXISTS public_songs_artist_idx ON public.public_songs (lower(artist));
CREATE INDEX IF NOT EXISTS public_songs_original_key_idx ON public.public_songs (original_key);
CREATE INDEX IF NOT EXISTS public_songs_created_at_idx ON public.public_songs (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS public_songs_song_id_uidx ON public.public_songs (song_id);

ALTER TABLE public.public_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_songs_select_all" ON public.public_songs;
DROP POLICY IF EXISTS "public_songs_insert_own" ON public.public_songs;
DROP POLICY IF EXISTS "public_songs_update_own" ON public.public_songs;
DROP POLICY IF EXISTS "public_songs_delete_own" ON public.public_songs;

CREATE POLICY "public_songs_select_all"
  ON public.public_songs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public_songs_insert_own"
  ON public.public_songs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "public_songs_update_own"
  ON public.public_songs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploader_id)
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "public_songs_delete_own"
  ON public.public_songs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploader_id);

-- Filter facets for UI chips (artists / keys / genres present in catalog).
CREATE OR REPLACE FUNCTION public.public_song_filter_facets()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'genres', coalesce((
      SELECT json_agg(g ORDER BY g)
      FROM (SELECT DISTINCT genre AS g FROM public.public_songs WHERE genre IS NOT NULL AND length(trim(genre)) > 0) s
    ), '[]'::json),
    'keys', coalesce((
      SELECT json_agg(k ORDER BY k)
      FROM (SELECT DISTINCT original_key AS k FROM public.public_songs WHERE original_key IS NOT NULL AND length(trim(original_key)) > 0) s
    ), '[]'::json),
    'artists', coalesce((
      SELECT json_agg(a ORDER BY a)
      FROM (
        SELECT DISTINCT artist AS a
        FROM public.public_songs
        WHERE artist IS NOT NULL AND length(trim(artist)) > 0
        ORDER BY artist
        LIMIT 80
      ) s
    ), '[]'::json),
    'total', (SELECT count(*)::int FROM public.public_songs)
  );
$$;

COMMENT ON FUNCTION public.public_song_filter_facets() IS
  'Distinct genre/key/artist values for community library filters.';

REVOKE ALL ON FUNCTION public.public_song_filter_facets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_song_filter_facets() TO anon, authenticated;
