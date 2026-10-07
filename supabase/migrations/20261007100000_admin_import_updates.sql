BEGIN;
-- Explicit administrator updates preserve existing song IDs.
DROP FUNCTION public.admin_import_songs(jsonb, boolean);
CREATE OR REPLACE FUNCTION public.admin_import_songs(p_songs jsonb, p_publish boolean DEFAULT false)
RETURNS TABLE(song_id text, status text, message text, target_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_song jsonb;
  v_id text;
  v_title text;
  v_artist text;
  v_count integer;
  v_target text;
  v_matches integer;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role = 'admin'
  ) THEN RAISE EXCEPTION 'Solo el administrador puede importar canciones' USING ERRCODE = '42501'; END IF;
  IF p_songs IS NULL OR jsonb_typeof(p_songs) <> 'array' THEN
    RAISE EXCEPTION 'Se requiere una lista de canciones';
  END IF;
  IF jsonb_array_length(p_songs) NOT BETWEEN 1 AND 50 OR octet_length(p_songs::text) > 2000000 THEN
    RAISE EXCEPTION 'Lote demasiado grande (máximo 50 canciones / 2 MB)';
  END IF;
  -- Serializes this importer, including concurrent tabs, for duplicate checks.
  PERFORM pg_advisory_xact_lock(29190000);
  FOR v_song IN SELECT value FROM jsonb_array_elements(p_songs) LOOP
    v_id := v_song->>'id';
    v_title := btrim(v_song->>'title');
    v_artist := coalesce(nullif(btrim(v_song->>'artist'), ''), 'Desconocido');
    BEGIN
      IF coalesce(v_id, '') !~ '^imp-[a-zA-Z0-9_-]{1,180}$'
        OR coalesce(length(v_title), 0) NOT BETWEEN 1 AND 200
        OR length(v_artist) > 300
        OR coalesce(length(btrim(v_song->>'chords')), 0) NOT BETWEEN 1 AND 100000
        OR coalesce(length(v_song->>'originalKey'), 0) NOT BETWEEN 1 AND 20
        OR coalesce(v_song->>'scaleMode', '') NOT IN ('major', 'minor')
        OR coalesce(v_song->>'originalGender', '') NOT IN ('male', 'female')
        OR coalesce(v_song->>'genre', '') NOT IN ('adoracion','alabanza','contemporaneo','himno','coral','juvenil','ninos','instrumental','otro')
      THEN RAISE EXCEPTION 'Datos de canción inválidos'; END IF;
      IF coalesce((v_song->>'updateExisting')::boolean, false) THEN
        v_target := NULL;
        IF p_publish THEN
          SELECT count(*), min(s.song_id) INTO v_matches, v_target FROM public.public_songs s
          WHERE lower(btrim(s.title)) = lower(v_title) AND lower(btrim(s.artist)) = lower(v_artist);
        ELSE
          SELECT count(*), min(s.song_id) INTO v_matches, v_target FROM public.user_songs s
          WHERE s.user_id = v_uid AND lower(btrim(s.title)) = lower(v_title) AND lower(btrim(s.artist)) = lower(v_artist);
        END IF;
        IF v_matches > 1 THEN RAISE EXCEPTION 'Varias coincidencias: revisa la canción manualmente'; END IF;
        IF v_target IS NOT NULL THEN
          IF p_publish THEN
            UPDATE public.public_songs s SET chords = v_song->>'chords', original_key = v_song->>'originalKey',
              scale_mode = v_song->>'scaleMode', genre = v_song->>'genre', original_gender = v_song->>'originalGender',
              bpm = coalesce(nullif(v_song->>'bpm','')::integer, s.bpm)
            WHERE s.song_id = v_target;
          END IF;
          UPDATE public.user_songs s SET chords = v_song->>'chords', key = v_song->>'originalKey',
            bpm = coalesce(nullif(v_song->>'bpm','')::integer, s.bpm),
            youtube_url = coalesce(nullif(v_song->>'youtubeUrl',''), s.youtube_url)
          WHERE s.user_id = v_uid AND s.song_id = v_target;
          RETURN QUERY SELECT v_id, 'updated'::text, ''::text, v_target;
          CONTINUE;
        END IF;
      END IF;
      IF p_publish AND EXISTS (
        SELECT 1 FROM public.public_songs s WHERE s.song_id = v_id OR
          (lower(btrim(s.title)) = lower(v_title) AND lower(btrim(s.artist)) = lower(v_artist))
      ) THEN
        RETURN QUERY SELECT v_id, 'skipped'::text, 'Ya existe en comunidad'::text, v_id;
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM public.user_songs s WHERE s.song_id = v_id AND s.user_id <> v_uid) THEN
        RETURN QUERY SELECT v_id, 'skipped'::text, 'Identificador existente de otro usuario'::text, v_id;
        CONTINUE;
      END IF;
      INSERT INTO public.user_songs(song_id, user_id, title, artist, key, chords, bpm, youtube_url)
      SELECT v_id, v_uid, v_title, v_artist, v_song->>'originalKey', v_song->>'chords',
        nullif(v_song->>'bpm','')::integer, nullif(v_song->>'youtubeUrl','')
      WHERE NOT EXISTS (SELECT 1 FROM public.user_songs s WHERE s.user_id = v_uid AND
        (s.song_id = v_id OR (lower(btrim(s.title)) = lower(v_title) AND lower(btrim(s.artist)) = lower(v_artist))))
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF p_publish THEN
        INSERT INTO public.public_songs(song_id, title, artist, original_key, scale_mode, chords,
          bpm, title_slug, uploader_id, genre, original_gender)
        VALUES (v_id, v_title, v_artist, v_song->>'originalKey', v_song->>'scaleMode', v_song->>'chords',
          nullif(v_song->>'bpm','')::integer, v_song->>'titleSlug', v_uid, v_song->>'genre', v_song->>'originalGender')
        ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS v_count = ROW_COUNT;
      END IF;
      RETURN QUERY SELECT v_id, CASE WHEN v_count > 0 THEN 'imported' ELSE 'skipped' END,
        CASE WHEN v_count > 0 THEN '' ELSE 'La canción ya existe' END, v_id;
    EXCEPTION WHEN OTHERS THEN
      -- Per-song subtransaction rolls back both writes on failure.
      RETURN QUERY SELECT v_id, 'error'::text, SQLERRM, v_id;
    END;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_import_songs(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_import_songs(jsonb, boolean) TO authenticated;

COMMIT;
