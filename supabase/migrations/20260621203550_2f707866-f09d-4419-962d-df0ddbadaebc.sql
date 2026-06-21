
-- Remove permissive write policies legadas — writes ocorrem via triggers SECURITY DEFINER (owner postgres)
DROP POLICY IF EXISTS streaks_upsert_own ON public.user_streaks;
DROP POLICY IF EXISTS streaks_update_own ON public.user_streaks;
DROP POLICY IF EXISTS streaks_insert_own ON public.user_streaks;
DROP POLICY IF EXISTS scores_upsert_own ON public.subject_scores;
DROP POLICY IF EXISTS scores_insert_own ON public.subject_scores;
DROP POLICY IF EXISTS scores_update_own ON public.subject_scores;

-- Deny explícito de anon em realtime.messages
DROP POLICY IF EXISTS realtime_deny_anon ON realtime.messages;
CREATE POLICY realtime_deny_anon ON realtime.messages
  AS RESTRICTIVE FOR SELECT TO anon
  USING (false);
