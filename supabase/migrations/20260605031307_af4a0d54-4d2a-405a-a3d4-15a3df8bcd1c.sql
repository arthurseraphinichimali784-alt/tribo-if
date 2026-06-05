
-- =====================================================================
-- 1. material_views: explicit auth check + admin/owner only
-- =====================================================================
DROP POLICY IF EXISTS views_select_own_or_admin ON public.material_views;
DROP POLICY IF EXISTS views_insert_any ON public.material_views;

CREATE POLICY views_select_own_or_admin ON public.material_views
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  );

-- Allow anonymous view tracking (user_id must be NULL) and authenticated tracking (must match)
CREATE POLICY views_insert_anon ON public.material_views
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY views_insert_authenticated ON public.material_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 2. analytics_events: remove public feed, restrict reads
-- =====================================================================
DROP POLICY IF EXISTS events_select_public_feed ON public.analytics_events;
DROP POLICY IF EXISTS events_select_own_or_admin ON public.analytics_events;
DROP POLICY IF EXISTS events_insert_any ON public.analytics_events;

CREATE POLICY events_select_own_or_admin ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY events_insert_anon ON public.analytics_events
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY events_insert_authenticated ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =====================================================================
-- 3. subject_scores + user_streaks: authenticated only
-- =====================================================================
DROP POLICY IF EXISTS subject_scores_select_all ON public.subject_scores;
DROP POLICY IF EXISTS "Public can view subject scores" ON public.subject_scores;
DROP POLICY IF EXISTS scores_select_all ON public.subject_scores;

CREATE POLICY scores_select_authenticated ON public.subject_scores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS streaks_select_all ON public.user_streaks;
DROP POLICY IF EXISTS "Public can view streaks" ON public.user_streaks;
DROP POLICY IF EXISTS user_streaks_select_all ON public.user_streaks;

CREATE POLICY streaks_select_authenticated ON public.user_streaks
  FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- 4. profiles: restrict full read, expose safe public view
-- =====================================================================
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Safe public view: omits 'state' (personal location). Stays bypassing
-- RLS via owner so anon can read what we intentionally expose.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT
  id, username, full_name, avatar_url, bio,
  level, xp, trust_score, is_teacher, institute, hourly_rate,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- =====================================================================
-- 5. user_roles: explicit restrictive denies for non-service writers
-- =====================================================================
-- (No SELECT change; existing roles_select_own stays.)
DROP POLICY IF EXISTS user_roles_no_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_no_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_no_delete ON public.user_roles;

CREATE POLICY user_roles_no_insert ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY user_roles_no_update ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY user_roles_no_delete ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);

-- =====================================================================
-- 6. reports: admin-only read/update; any authenticated user can file
-- =====================================================================
DROP POLICY IF EXISTS reports_insert_own ON public.reports;
DROP POLICY IF EXISTS reports_select_own_or_admin ON public.reports;
DROP POLICY IF EXISTS reports_update_admin ON public.reports;
DROP POLICY IF EXISTS reports_delete_admin ON public.reports;

CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY reports_select_admin ON public.reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY reports_update_admin ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY reports_delete_admin ON public.reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 7. Realtime: scope channel subscriptions to own user notifications
-- =====================================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS realtime_authenticated_own_topics ON realtime.messages;

CREATE POLICY realtime_authenticated_own_topics ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    -- per-user notification channel used by useNotifications hook
    realtime.topic() = 'notifications-' || (auth.uid())::text
  );

-- =====================================================================
-- 8. Revoke EXECUTE on SECURITY DEFINER trigger helpers
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.bump_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_comment_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_favorite_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_material_download_bump() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_material_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_material() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_view_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_material_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_badge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_report_resolved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_event_streak() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role is required by RLS policies and must stay callable
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- =====================================================================
-- 9. Storage: tighten materials bucket read policy
-- =====================================================================
DROP POLICY IF EXISTS materials_read_auth ON storage.objects;

-- Authenticated users can read a file in the materials bucket only if:
--   * they own it (first folder segment matches their uid), OR
--   * the related material row is published (the row in materials.file_path = name)
CREATE POLICY materials_read_owner_or_published ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materials'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.file_path = storage.objects.name
          AND m.published = true
      )
    )
  );
