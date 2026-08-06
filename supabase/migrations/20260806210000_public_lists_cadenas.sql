-- Public setlists ("cadenas") + comments for community library.

CREATE TABLE IF NOT EXISTS public.public_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  owner_name text NOT NULL DEFAULT '',
  songs jsonb NOT NULL DEFAULT '[]'::jsonb,
  song_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_lists_slug_unique UNIQUE (slug),
  CONSTRAINT public_lists_name_len CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  CONSTRAINT public_lists_song_count_nonneg CHECK (song_count >= 0)
);

CREATE INDEX IF NOT EXISTS public_lists_created_at_idx
  ON public.public_lists (created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS public_lists_owner_idx
  ON public.public_lists (owner_id);

CREATE TABLE IF NOT EXISTS public.public_list_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.public_lists (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_list_comments_body_len CHECK (
    char_length(trim(body)) BETWEEN 1 AND 1000
  )
);

CREATE INDEX IF NOT EXISTS public_list_comments_list_idx
  ON public.public_list_comments (list_id, created_at DESC);

ALTER TABLE public.public_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_list_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_lists_select_active" ON public.public_lists;
DROP POLICY IF EXISTS "public_lists_insert_own" ON public.public_lists;
DROP POLICY IF EXISTS "public_lists_update_own" ON public.public_lists;
DROP POLICY IF EXISTS "public_lists_delete_own" ON public.public_lists;

CREATE POLICY "public_lists_select_active"
  ON public.public_lists
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR auth.uid() = owner_id);

CREATE POLICY "public_lists_insert_own"
  ON public.public_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "public_lists_update_own"
  ON public.public_lists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "public_lists_delete_own"
  ON public.public_lists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "public_list_comments_select" ON public.public_list_comments;
DROP POLICY IF EXISTS "public_list_comments_insert_own" ON public.public_list_comments;
DROP POLICY IF EXISTS "public_list_comments_delete_own" ON public.public_list_comments;

CREATE POLICY "public_list_comments_select"
  ON public.public_list_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.public_lists pl
      WHERE pl.id = list_id
        AND (pl.is_active = true OR pl.owner_id = auth.uid())
    )
  );

CREATE POLICY "public_list_comments_insert_own"
  ON public.public_list_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.public_lists pl
      WHERE pl.id = list_id AND pl.is_active = true
    )
  );

CREATE POLICY "public_list_comments_delete_own"
  ON public.public_list_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
