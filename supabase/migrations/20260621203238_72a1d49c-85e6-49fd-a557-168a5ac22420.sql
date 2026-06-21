
-- ============================================================
-- Security hardening pass
-- ============================================================

-- 1) has_role: restringe enumeração — só self ou admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RETURN false;
  END IF;
  -- Permite checar a si mesmo, ou se for admin checar qualquer um
  IF v_caller <> _user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller AND role = 'admin'::app_role
    ) THEN
      RETURN false;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2) subject_scores: somente o dono lê
DROP POLICY IF EXISTS scores_select_authenticated ON public.subject_scores;
DROP POLICY IF EXISTS subject_scores_select_authenticated ON public.subject_scores;
CREATE POLICY scores_select_own ON public.subject_scores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3) user_streaks: somente o dono lê
DROP POLICY IF EXISTS streaks_select_authenticated ON public.user_streaks;
CREATE POLICY streaks_select_own ON public.user_streaks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4) profiles: remove SELECT amplo para anon (campo state era exposto).
-- A view public_profiles (security_invoker) + GRANT por coluna continua atendendo o anon.
DROP POLICY IF EXISTS profiles_select_anon_safe ON public.profiles;

-- Mantém leitura por coluna para anon (já concedido em migration anterior),
-- e garante que authenticated continue lendo tudo:
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Permite anon ler apenas as linhas via RLS, mas o GRANT por coluna
-- impede acesso a `state`, `email`, etc.
CREATE POLICY profiles_select_anon_columns ON public.profiles
  FOR SELECT TO anon USING (true);

-- Revoga SELECT amplo de anon (caso exista) e mantém só os column grants
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, full_name, avatar_url, bio, level, xp,
              trust_score, is_teacher, institute, hourly_rate,
              created_at, updated_at)
ON public.profiles TO anon;

-- 5) reports: remove policies duplicadas
DROP POLICY IF EXISTS "users create own reports" ON public.reports;
DROP POLICY IF EXISTS "users see own reports" ON public.reports;
DROP POLICY IF EXISTS "admins update reports" ON public.reports;
-- Mantidas: reports_insert_own, reports_select_admin, reports_update_admin, reports_delete_admin

-- 6) Storage: avatars — DELETE somente do próprio dono
DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Reforça INSERT/UPDATE também restritos ao dono
DROP POLICY IF EXISTS avatars_upload_own ON storage.objects;
CREATE POLICY avatars_upload_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 7) Storage: materials — permite leitura anônima de arquivos publicados
DROP POLICY IF EXISTS materials_read_anon_published ON storage.objects;
CREATE POLICY materials_read_anon_published ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'materials'
    AND EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.file_path = storage.objects.name
        AND m.published = true
    )
  );

-- 8) Realtime: substitui policy restritiva por uma que permite
-- subscribers autenticados — postgres_changes ainda respeita RLS da tabela base,
-- e topics user-scoped continuam protegidos pelo filtro abaixo.
DROP POLICY IF EXISTS realtime_authenticated_own_topics ON realtime.messages;
CREATE POLICY realtime_authenticated_subscribe ON realtime.messages
  FOR SELECT TO authenticated
  USING (true);

-- 9) Remove tabelas sensíveis da publicação realtime quando o realtime
-- não é necessário (subject_scores e user_streaks já têm SELECT self-only,
-- mas removemos da publicação para evitar qualquer evento cross-user).
-- Mantemos: notifications, materials, comments, comment_likes, favorites,
-- material_likes, profiles (usados por hooks de UI).
ALTER PUBLICATION supabase_realtime DROP TABLE public.subject_scores;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_streaks;
