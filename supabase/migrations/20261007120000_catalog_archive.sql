-- Reversible catalog cleanup; never deletes songs, lists or favorites.
CREATE TABLE IF NOT EXISTS public.catalog_archived_songs (
  song_id text PRIMARY KEY,
  archived_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_archived_songs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_archived_songs FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.catalog_archived_song_ids()
RETURNS TABLE(song_id text) LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT a.song_id FROM public.catalog_archived_songs a $$;
REVOKE ALL ON FUNCTION public.catalog_archived_song_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_archived_song_ids() TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.admin_archive_catalog_songs(p_ids text[], p_archive boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede limpiar el catálogo' USING ERRCODE='42501';
  END IF;
  IF p_archive IS NULL OR coalesce(cardinality(p_ids),0) NOT BETWEEN 1 AND 200
    OR EXISTS(SELECT 1 FROM unnest(p_ids) AS id WHERE id IS NULL OR length(id) NOT BETWEEN 1 AND 200) THEN
    RAISE EXCEPTION 'Selecciona entre 1 y 200 canciones';
  END IF;
  IF p_archive THEN
    INSERT INTO public.catalog_archived_songs(song_id, archived_by)
      SELECT DISTINCT id, auth.uid() FROM unnest(p_ids) AS id ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.catalog_archived_songs WHERE song_id=ANY(p_ids);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_archive_catalog_songs(text[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_catalog_songs(text[], boolean) TO authenticated;
