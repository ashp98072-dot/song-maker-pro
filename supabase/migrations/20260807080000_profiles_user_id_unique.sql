-- Full UNIQUE on profiles.user_id so upsert/onConflict works (partial index is not enough).

DROP INDEX IF EXISTS public.profiles_user_id_uidx;

-- Keep one row per user_id if duplicates exist.
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.user_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.ctid < b.ctid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;
