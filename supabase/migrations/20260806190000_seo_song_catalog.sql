-- Public SEO catalog for sitemap + crawler prerender (SECURITY DEFINER).
-- Allows anon/authenticated to read title/artist/chords without opening full table RLS.
-- Safe for letras-style indexing; does not expose user_id.

CREATE OR REPLACE FUNCTION public.seo_song_catalog(p_limit integer DEFAULT 5000)
RETURNS TABLE (
  song_id text,
  title text,
  artist text,
  chords text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.song_id::text,
    t.title,
    coalesce(t.artist, ''),
    coalesce(t.chords, ''),
    t.updated_at
  FROM (
    SELECT DISTINCT ON (us.song_id)
      us.song_id,
      us.title,
      us.artist,
      us.chords,
      us.updated_at
    FROM public.user_songs us
    WHERE us.title IS NOT NULL
      AND length(trim(us.title)) > 0
    ORDER BY us.song_id, us.updated_at DESC NULLS LAST
  ) t
  ORDER BY t.updated_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 5000), 5000));
$$;

COMMENT ON FUNCTION public.seo_song_catalog(integer) IS
  'Public song catalog for SEO sitemap/prerender (no user_id).';

REVOKE ALL ON FUNCTION public.seo_song_catalog(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seo_song_catalog(integer) TO anon, authenticated;
