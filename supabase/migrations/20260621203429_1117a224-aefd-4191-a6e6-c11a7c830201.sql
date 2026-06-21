
-- 1) Realtime: tópicos por usuário + canais públicos conhecidos
DROP POLICY IF EXISTS realtime_authenticated_subscribe ON realtime.messages;
CREATE POLICY realtime_authenticated_scoped ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'marketplace-materials'
    OR realtime.topic() LIKE 'materials-%'
    OR realtime.topic() LIKE 'comments-%'
    OR realtime.topic() LIKE 'material-%'
    OR realtime.topic() = ('notifications-' || (auth.uid())::text)
    OR realtime.topic() = ('fav-' || (auth.uid())::text)
    OR realtime.topic() = ('stats-' || (auth.uid())::text)
    OR realtime.topic() = ('streak-' || (auth.uid())::text)
  );

-- 2) Restrictive denies em subject_scores (writes só via trigger SECURITY DEFINER / service role)
DROP POLICY IF EXISTS subject_scores_no_insert ON public.subject_scores;
DROP POLICY IF EXISTS subject_scores_no_update ON public.subject_scores;
DROP POLICY IF EXISTS subject_scores_no_delete ON public.subject_scores;
CREATE POLICY subject_scores_no_insert ON public.subject_scores
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY subject_scores_no_update ON public.subject_scores
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY subject_scores_no_delete ON public.subject_scores
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- 3) Restrictive denies em user_streaks (writes só via bump_streak)
DROP POLICY IF EXISTS user_streaks_no_insert ON public.user_streaks;
DROP POLICY IF EXISTS user_streaks_no_update ON public.user_streaks;
DROP POLICY IF EXISTS user_streaks_no_delete ON public.user_streaks;
CREATE POLICY user_streaks_no_insert ON public.user_streaks
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY user_streaks_no_update ON public.user_streaks
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY user_streaks_no_delete ON public.user_streaks
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- 4) profiles: remove policy ampla para anon. Anon agora lê só via view public_profiles.
DROP POLICY IF EXISTS profiles_select_anon_columns ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

-- Recria public_profiles como security_definer (owner=postgres bypassa RLS),
-- expondo apenas colunas seguras. Anon recebe SELECT só na view.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT
  id, username, full_name, avatar_url, bio,
  level, xp, trust_score, is_teacher, institute, hourly_rate,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
