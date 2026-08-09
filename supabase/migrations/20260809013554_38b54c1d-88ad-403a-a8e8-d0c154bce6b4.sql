DROP POLICY IF EXISTS profiles_select_public ON public.profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own ON public.profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.recalc_review_stats() FROM PUBLIC, anon, authenticated;