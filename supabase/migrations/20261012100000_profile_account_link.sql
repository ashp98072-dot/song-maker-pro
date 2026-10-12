-- Legacy auth signup creates profiles.id but can omit the app's user_id.
-- Repair only unambiguous null links, without deleting or replacing profiles.
BEGIN;
UPDATE public.profiles p SET user_id = p.id
WHERE p.user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.profiles other WHERE other.user_id = p.id);

CREATE OR REPLACE FUNCTION public.profile_fill_account_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.id) THEN
    NEW.user_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.profile_fill_account_link() FROM PUBLIC;
DROP TRIGGER IF EXISTS profile_fill_account_link ON public.profiles;
CREATE TRIGGER profile_fill_account_link BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profile_fill_account_link();
COMMIT;

