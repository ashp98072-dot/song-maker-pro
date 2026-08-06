-- Community library: create public_songs (if missing) + genre taxonomy + RLS + facets RPC.
-- NOTE: production may not have public_songs yet (types assumed it; this creates it).

CREATE TABLE IF NOT EXISTS public.public_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id text NOT NULL,
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  original_key text NOT NULL DEFAULT 'C',
  scale_mode text NOT NULL DEFAULT 'major',
  chords text NOT NULL DEFAULT '',
  bpm integer,
  suggested_key text,
  title_slug text NOT NULL,
  is_cover boolean NOT NULL DEFAULT false,
  uploader_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  genre text NOT NULL DEFAULT 'adoracion',
  original_gender text NOT NULL DEFAULT 'male',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_songs_song_id_unique UNIQUE (song_id),
  CONSTRAINT public_songs_title_len CHECK (char_length(trim(title)) BETWEEN 1 AND 200)
);

-- Safer for DBs that already had a partial public_songs without these columns.
ALTER TABLE public.public_songs
  ADD COLUMN IF NOT EXISTS genre text NOT NULL DEFAULT 'adoracion',
  ADD COLUMN IF NOT EXISTS original_gender text NOT NULL DEFAULT 'male',
  ADD COLUMN IF NOT EXISTS bpm integer,
  ADD COLUMN IF NOT EXISTS suggested_key text,
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scale_mode text NOT NULL DEFAULT 'major',
  ADD COLUMN IF NOT EXISTS chords text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS original_key text NOT NULL DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS title_slug text,
  ADD COLUMN IF NOT EXISTS artist text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

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
