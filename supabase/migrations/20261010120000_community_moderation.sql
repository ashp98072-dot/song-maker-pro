BEGIN;
CREATE TABLE public.community_rules_acceptance (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.community_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_id, blocked_id), CHECK(blocker_id <> blocked_id)
);
CREATE INDEX community_blocks_reverse ON public.community_blocks(blocked_id, blocker_id);
CREATE TABLE public.community_suspensions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.community_hidden_content (
  kind text NOT NULL CHECK(kind IN ('song', 'list', 'comment')),
  target_id text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(kind, target_id)
);
CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('song', 'list', 'comment', 'user')),
  target_id text NOT NULL,
  reason text NOT NULL CHECK(reason IN ('abuse', 'spam', 'sexual', 'violence', 'privacy', 'rights', 'other')),
  details text NOT NULL DEFAULT '' CHECK(length(details) <= 1000),
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'dismissed', 'hidden', 'suspended', 'restored')),
  resolution text NOT NULL DEFAULT '' CHECK(length(resolution) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX community_reports_one_open ON public.community_reports(reporter_id, kind, target_id) WHERE status = 'open';
CREATE INDEX community_reports_queue ON public.community_reports(status, created_at DESC);
CREATE INDEX community_reports_rate ON public.community_reports(reporter_id, created_at);
ALTER TABLE public.community_rules_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_hidden_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_rules_acceptance, public.community_blocks, public.community_suspensions,
  public.community_hidden_content, public.community_reports FROM anon, authenticated;

CREATE FUNCTION public.community_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;
CREATE FUNCTION public.community_can_view(p_kind text, p_target_id text, p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT NOT EXISTS(SELECT 1 FROM public.community_hidden_content WHERE kind = p_kind AND target_id = p_target_id)
 AND NOT EXISTS(SELECT 1 FROM public.community_suspensions WHERE user_id = p_owner)
 AND NOT EXISTS(SELECT 1 FROM public.community_blocks
   WHERE (blocker_id = auth.uid() AND blocked_id = p_owner) OR (blocked_id = auth.uid() AND blocker_id = p_owner))
$$;
REVOKE ALL ON FUNCTION public.community_is_admin(), public.community_can_view(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_is_admin(), public.community_can_view(text, text, uuid) TO anon, authenticated;

-- Restrictive policies compose with existing ownership policies; no client can bypass them.
CREATE POLICY community_song_visibility ON public.public_songs AS RESTRICTIVE FOR SELECT TO anon, authenticated
 USING(public.community_can_view('song', song_id, uploader_id));
CREATE FUNCTION public.community_list_can_view(p_id uuid, p_owner uuid, p_songs jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.community_can_view('list', p_id::text, p_owner)
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_songs) = 'array' THEN p_songs ELSE '[]'::jsonb END) s
   WHERE EXISTS(SELECT 1 FROM public.community_hidden_content h WHERE h.kind = 'song' AND h.target_id = s->>'song_id')
   OR EXISTS(SELECT 1 FROM public.public_songs ps WHERE ps.song_id = s->>'song_id' AND NOT public.community_can_view('song', ps.song_id, ps.uploader_id)))
$$;
REVOKE ALL ON FUNCTION public.community_list_can_view(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_list_can_view(uuid, uuid, jsonb) TO anon, authenticated;
CREATE POLICY community_list_visibility ON public.public_lists AS RESTRICTIVE FOR SELECT TO anon, authenticated
 USING(public.community_list_can_view(id, owner_id, songs));
CREATE POLICY community_comment_visibility ON public.public_list_comments AS RESTRICTIVE FOR SELECT TO anon, authenticated
 USING(public.community_can_view('comment', id::text, user_id));
CREATE FUNCTION public.community_profile_can_view(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p_user = auth.uid() OR (public.community_can_view('user', p_user::text, p_user)
   AND EXISTS(SELECT 1 FROM public.community_rules_acceptance WHERE user_id = p_user AND version = 1))
$$;
REVOKE ALL ON FUNCTION public.community_profile_can_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_profile_can_view(uuid) TO anon, authenticated;
CREATE POLICY community_profile_visibility ON public.profiles AS RESTRICTIVE FOR SELECT TO anon, authenticated
 USING(public.community_profile_can_view(user_id));
CREATE POLICY community_follow_visibility ON public.user_follows AS RESTRICTIVE FOR SELECT TO anon, authenticated
 USING(public.community_can_view('user', follower_id::text, follower_id) AND public.community_can_view('user', following_id::text, following_id));
CREATE POLICY community_follow_block ON public.user_follows AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(public.community_can_view('user', following_id::text, following_id));

CREATE FUNCTION public.community_rules_status() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM public.community_rules_acceptance WHERE user_id = auth.uid() AND version = 1)
$$;
CREATE FUNCTION public.community_accept_rules() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para aceptar las reglas'; END IF;
 INSERT INTO public.community_rules_acceptance(user_id, version) VALUES(auth.uid(), 1)
 ON CONFLICT(user_id) DO UPDATE SET version = 1, accepted_at = now();
END $$;

CREATE FUNCTION public.community_guard_publish() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_kind text; v_id text;
BEGIN
 IF TG_TABLE_NAME = 'public_songs' THEN v_owner := NEW.uploader_id; v_kind := 'song'; v_id := NEW.song_id;
 ELSIF TG_TABLE_NAME = 'public_lists' THEN
   v_owner := NEW.owner_id; v_kind := 'list'; v_id := NEW.id::text;
   -- Removing a public chain is not a publication.
   IF TG_OP = 'UPDATE' THEN IF NEW.is_active = false THEN RETURN NEW; END IF; END IF;
 ELSIF TG_TABLE_NAME = 'profiles' THEN v_owner := NEW.user_id; v_kind := 'user'; v_id := NEW.user_id::text;
 ELSE v_owner := NEW.user_id; v_kind := 'comment'; v_id := NEW.id::text; END IF;
 IF auth.uid() IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.community_suspensions WHERE user_id = auth.uid()) THEN
     RAISE EXCEPTION 'Tu participación en Comunidad está suspendida. Contacta a worshiptranspose@gmail.com'; END IF;
   IF NOT public.community_rules_status() THEN RAISE EXCEPTION 'Acepta las reglas de Comunidad antes de publicar'; END IF;
   IF NOT public.community_is_admin() AND EXISTS(SELECT 1 FROM public.community_hidden_content WHERE kind = v_kind AND target_id = v_id) THEN
     RAISE EXCEPTION 'Este contenido fue retirado por moderación'; END IF;
   IF TG_TABLE_NAME = 'public_list_comments' AND TG_OP = 'INSERT' THEN
     NEW.created_at := now();
     PERFORM pg_advisory_xact_lock(hashtext('community-comment-' || auth.uid()::text));
     IF (SELECT count(*) FROM public.public_list_comments WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 20 THEN
       RAISE EXCEPTION 'Has alcanzado el límite de comentarios. Intenta más tarde'; END IF;
     IF EXISTS(SELECT 1 FROM public.public_lists l WHERE l.id = NEW.list_id
        AND NOT public.community_list_can_view(l.id, l.owner_id, l.songs)) THEN
       RAISE EXCEPTION 'No puedes comentar en esta cadena'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER community_guard_song BEFORE INSERT OR UPDATE ON public.public_songs FOR EACH ROW EXECUTE FUNCTION public.community_guard_publish();
CREATE TRIGGER community_guard_list BEFORE INSERT OR UPDATE ON public.public_lists FOR EACH ROW EXECUTE FUNCTION public.community_guard_publish();
CREATE TRIGGER community_guard_comment BEFORE INSERT OR UPDATE ON public.public_list_comments FOR EACH ROW EXECUTE FUNCTION public.community_guard_publish();
CREATE TRIGGER community_guard_profile BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.community_guard_publish();

CREATE FUNCTION public.community_can_publish() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.community_rules_status() AND NOT EXISTS(SELECT 1 FROM public.community_suspensions WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.community_can_publish() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_can_publish() TO authenticated;
CREATE POLICY community_avatar_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id <> 'avatars' OR public.community_can_publish());
CREATE POLICY community_avatar_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id <> 'avatars' OR public.community_can_publish())
 WITH CHECK(bucket_id <> 'avatars' OR public.community_can_publish());

CREATE FUNCTION public.community_set_block(p_user_id uuid, p_block boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para bloquear'; END IF;
 IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'No puedes bloquearte'; END IF;
 IF p_block THEN
   INSERT INTO public.community_blocks(blocker_id, blocked_id) VALUES(auth.uid(), p_user_id) ON CONFLICT DO NOTHING;
   DELETE FROM public.user_follows WHERE (follower_id = auth.uid() AND following_id = p_user_id)
      OR (following_id = auth.uid() AND follower_id = p_user_id);
 ELSE DELETE FROM public.community_blocks WHERE blocker_id = auth.uid() AND blocked_id = p_user_id; END IF;
END $$;
CREATE FUNCTION public.community_my_blocks() RETURNS TABLE(user_id uuid, display_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT b.blocked_id, CASE WHEN EXISTS(SELECT 1 FROM public.community_rules_acceptance a WHERE a.user_id = b.blocked_id AND a.version = 1)
   THEN coalesce(p.display_name, 'Usuario') ELSE 'Usuario' END, b.created_at
 FROM public.community_blocks b LEFT JOIN public.profiles p ON p.user_id = b.blocked_id
 WHERE b.blocker_id = auth.uid() ORDER BY b.created_at DESC
$$;

CREATE FUNCTION public.community_report(p_kind text, p_target_id text, p_reason text, p_details text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_snapshot jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para reportar'; END IF;
 IF p_kind = 'song' THEN SELECT uploader_id, jsonb_build_object('title', title, 'artist', artist, 'body', chords) INTO v_owner, v_snapshot FROM public.public_songs WHERE song_id = p_target_id;
 ELSIF p_kind = 'list' THEN SELECT owner_id, jsonb_build_object('title', name, 'body', description, 'songs', songs) INTO v_owner, v_snapshot FROM public.public_lists WHERE id::text = p_target_id;
 ELSIF p_kind = 'comment' THEN SELECT user_id, jsonb_build_object('title', author_name, 'body', body, 'list_id', list_id) INTO v_owner, v_snapshot FROM public.public_list_comments WHERE id::text = p_target_id;
 ELSIF p_kind = 'user' THEN SELECT id, jsonb_build_object('title', coalesce((SELECT display_name FROM public.profiles WHERE user_id = u.id LIMIT 1), 'Usuario')) INTO v_owner, v_snapshot FROM auth.users u WHERE id::text = p_target_id;
 END IF;
 IF v_owner IS NULL OR v_owner = auth.uid() THEN RAISE EXCEPTION 'El contenido no está disponible para reportarlo'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('community-report-' || auth.uid()::text));
 IF EXISTS(SELECT 1 FROM public.community_reports WHERE reporter_id = auth.uid() AND kind = p_kind AND target_id = p_target_id AND status = 'open') THEN RETURN; END IF;
 IF (SELECT count(*) FROM public.community_reports WHERE reporter_id = auth.uid() AND created_at > now() - interval '1 day') >= 20 THEN
   RAISE EXCEPTION 'Has alcanzado el límite de reportes. Intenta mañana'; END IF;
 INSERT INTO public.community_reports(reporter_id, target_user_id, kind, target_id, reason, details, snapshot)
 VALUES(auth.uid(), v_owner, p_kind, p_target_id, p_reason, coalesce(p_details, ''), v_snapshot);
END $$;

CREATE FUNCTION public.community_admin_reports() RETURNS SETOF public.community_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.community_is_admin() THEN RAISE EXCEPTION 'Solo el administrador puede revisar reportes' USING ERRCODE = '42501'; END IF;
 DELETE FROM public.community_reports r WHERE resolved_at < now() - interval '90 days'
   AND NOT EXISTS(SELECT 1 FROM public.community_hidden_content h WHERE h.kind = r.kind AND h.target_id = r.target_id)
   AND NOT EXISTS(SELECT 1 FROM public.community_suspensions s WHERE s.user_id = r.target_user_id);
 RETURN QUERY SELECT * FROM public.community_reports ORDER BY (status = 'open') DESC, created_at DESC LIMIT 200;
END $$;
CREATE FUNCTION public.community_admin_resolve(p_report_id uuid, p_action text, p_note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.community_reports;
BEGIN
 IF NOT public.community_is_admin() THEN RAISE EXCEPTION 'Solo el administrador puede moderar' USING ERRCODE = '42501'; END IF;
 SELECT * INTO r FROM public.community_reports WHERE id = p_report_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reporte no encontrado'; END IF;
 IF p_action = 'hide' AND r.kind <> 'user' THEN
   INSERT INTO public.community_hidden_content(kind, target_id, owner_id) VALUES(r.kind, r.target_id, r.target_user_id) ON CONFLICT DO NOTHING;
 ELSIF p_action = 'suspend' THEN
   IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = r.target_user_id AND role = 'admin') THEN RAISE EXCEPTION 'No puedes suspender a un administrador'; END IF;
   INSERT INTO public.community_suspensions(user_id) VALUES(r.target_user_id) ON CONFLICT DO NOTHING;
 ELSIF p_action = 'restore' THEN
   DELETE FROM public.community_hidden_content WHERE kind = r.kind AND target_id = r.target_id;
 ELSIF p_action = 'unsuspend' THEN
   DELETE FROM public.community_suspensions WHERE user_id = r.target_user_id;
 ELSIF p_action <> 'dismiss' THEN RAISE EXCEPTION 'Acción inválida'; END IF;
 UPDATE public.community_reports SET status = CASE p_action WHEN 'hide' THEN 'hidden' WHEN 'suspend' THEN 'suspended'
   WHEN 'dismiss' THEN 'dismissed' ELSE 'restored' END, resolution = coalesce(p_note, ''), resolved_at = now() WHERE id = p_report_id;
END $$;

REVOKE ALL ON FUNCTION public.community_rules_status(), public.community_accept_rules(), public.community_guard_publish(),
 public.community_set_block(uuid, boolean), public.community_my_blocks(), public.community_report(text, text, text, text),
 public.community_admin_reports(), public.community_admin_resolve(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_rules_status(), public.community_accept_rules(), public.community_set_block(uuid, boolean),
 public.community_my_blocks(), public.community_report(text, text, text, text), public.community_admin_reports(),
 public.community_admin_resolve(uuid, text, text) TO authenticated;
CREATE FUNCTION public.community_unavailable_song_ids() RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce(array_agg(DISTINCT id), '{}'::text[]) FROM (
   SELECT target_id AS id FROM public.community_hidden_content WHERE kind = 'song'
   UNION SELECT song_id FROM public.public_songs WHERE NOT public.community_can_view('song', song_id, uploader_id)
   UNION SELECT us.song_id FROM public.user_songs us WHERE NOT public.community_can_view('song', us.song_id, us.user_id)
     AND NOT EXISTS(SELECT 1 FROM public.public_songs ps WHERE ps.song_id = us.song_id)
 ) unavailable
$$;
REVOKE ALL ON FUNCTION public.community_unavailable_song_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_unavailable_song_ids() TO anon, authenticated, service_role;

-- The public SEO RPC bypasses table RLS, so it must also apply moderation.
CREATE OR REPLACE FUNCTION public.seo_song_catalog(p_limit integer DEFAULT 5000)
RETURNS TABLE(song_id text, title text, artist text, chords text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT t.song_id::text, t.title, coalesce(t.artist, ''), coalesce(t.chords, ''), t.created_at FROM (
   SELECT DISTINCT ON (us.song_id) us.song_id, us.title, us.artist, us.chords, us.created_at FROM public.user_songs us
   WHERE us.title IS NOT NULL AND length(trim(us.title)) > 0
     AND public.community_can_view('song', us.song_id, us.user_id)
     AND NOT EXISTS(SELECT 1 FROM public.public_songs ps WHERE ps.song_id = us.song_id AND NOT public.community_can_view('song', ps.song_id, ps.uploader_id))
   ORDER BY us.song_id, us.created_at DESC NULLS LAST
 ) t ORDER BY t.created_at DESC NULLS LAST LIMIT greatest(1, least(coalesce(p_limit, 5000), 5000))
$$;
COMMIT;
