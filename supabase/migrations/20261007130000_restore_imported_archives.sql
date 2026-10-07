-- Wrap the admin import so updates and restoration commit together.
CREATE OR REPLACE FUNCTION public.admin_import_restore_songs(p_songs jsonb, p_publish boolean DEFAULT false)
RETURNS TABLE(song_id text, status text, message text, target_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_text text;
  v_index integer := 0;
  v_line text;
  v_has_chords boolean;
  v_chord text := '[A-G][#b♯♭]?((maj|min|m|dim|aug|sus|add|alt)\d*)*\d*([#b]\d+)*(/[A-G][#b♯♭]?)?';
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede importar canciones' USING ERRCODE='42501';
  END IF;
  FOR r IN SELECT * FROM public.admin_import_songs(p_songs,p_publish) LOOP
    IF p_publish AND r.status = 'updated' THEN
      v_text := p_songs->v_index->>'chords';
      v_has_chords := false;
      FOREACH v_line IN ARRAY string_to_array(coalesce(v_text,''), E'\n') LOOP
        IF btrim(v_line) <> '' AND v_line ~ ('^[[:space:],.;:|()/ -]*(' || v_chord || '[[:space:],.;:|()/ -]*)+$') THEN
          v_has_chords := true;
          EXIT;
        END IF;
      END LOOP;
      IF v_has_chords THEN
        DELETE FROM public.catalog_archived_songs a WHERE a.song_id = r.target_id;
      END IF;
    END IF;
    v_index := v_index + 1;
    RETURN QUERY SELECT r.song_id, r.status, r.message, r.target_id;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_import_restore_songs(jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_import_restore_songs(jsonb,boolean) TO authenticated;
