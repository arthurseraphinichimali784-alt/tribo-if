
-- 1. public_profiles → security_invoker, plus permit anon to read the
-- limited set of columns via a column-aware policy on profiles.
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT
  id, username, full_name, avatar_url, bio,
  level, xp, trust_score, is_teacher, institute, hourly_rate,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT (id, username, full_name, avatar_url, bio, level, xp,
              trust_score, is_teacher, institute, hourly_rate,
              created_at, updated_at)
ON public.profiles TO anon;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow anon row-level access so the view (running as invoker) can read.
-- Column-level GRANTs above ensure `state` and other sensitive columns
-- still raise permission errors if queried directly by anon.
DROP POLICY IF EXISTS profiles_select_anon_safe ON public.profiles;
CREATE POLICY profiles_select_anon_safe ON public.profiles
  FOR SELECT TO anon USING (true);

-- 2. Avatars: drop the broad listing policy. Bucket remains public, so
-- direct object URLs continue to resolve, but the listing API is blocked.
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
