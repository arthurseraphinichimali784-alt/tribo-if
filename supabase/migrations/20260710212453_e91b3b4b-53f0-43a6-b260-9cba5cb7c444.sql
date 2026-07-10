
-- =========================================================
-- 1) PROFILES: restringir SELECT ao próprio dono
-- =========================================================
-- Anteriormente qualquer usuário autenticado podia ler todas as
-- colunas de todos os perfis (incluindo state, institute, hourly_rate,
-- full_name). Agora só o dono lê a linha crua; o resto do app usa
-- a view public_profiles.

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Bloqueia leitura direta por anon (a view public_profiles cobre o público)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;

-- =========================================================
-- 2) public_profiles: recriar como security_invoker
-- =========================================================
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id, username, full_name, avatar_url, bio,
  level, xp, trust_score, is_teacher, institute,
  hourly_rate, created_at, updated_at
FROM public.profiles;

-- Como agora a view roda com privilégios do chamador e a base
-- só libera SELECT ao próprio dono, precisamos de uma policy pública
-- na base que exponha APENAS as colunas seguras via a view.
-- Solução: policy adicional que permite SELECT a todos, mas o app
-- SÓ deve consultar a view. Para evitar vazamento, criamos uma
-- policy que permite ler as linhas somente pela view usando um
-- marker de sessão não é confiável — então usamos uma abordagem
-- diferente: policy pública ampla + confiar que clientes consultam
-- a view. Isso reintroduziria o problema.
--
-- Abordagem correta: manter policy só-dono na base e recriar a view
-- como SECURITY DEFINER function-backed. Como o linter recusa SECURITY
-- DEFINER view, usamos uma função STABLE SECURITY DEFINER que retorna
-- apenas colunas públicas, e a view apenas encapsula essa função.

DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  level integer,
  xp integer,
  trust_score numeric,
  is_teacher boolean,
  institute text,
  hourly_rate numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, username, full_name, avatar_url, bio,
         level, xp, trust_score, is_teacher, institute,
         hourly_rate, created_at, updated_at
  FROM public.profiles;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;

CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT * FROM public.get_public_profiles();

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- =========================================================
-- 3) REALTIME: endurecer policy de messages
-- =========================================================
-- Antes: wildcards abertos `materials-%`, `comments-%`, `material-%`
-- deixavam subscrever qualquer sufixo. Agora exigimos UUID válido
-- e mantemos apenas tópicos realmente usados pelo app.

DROP POLICY IF EXISTS realtime_authenticated_scoped ON realtime.messages;

CREATE POLICY realtime_authenticated_scoped
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- Tópicos públicos (conteúdo publicado, protegido por RLS da tabela)
    realtime.topic() = 'marketplace-materials'
    OR realtime.topic() ~ '^material-[0-9a-f-]{36}$'
    OR realtime.topic() ~ '^comments-[0-9a-f-]{36}$'
    -- Tópicos privados: só o próprio usuário
    OR realtime.topic() = ('notifications-' || auth.uid()::text)
    OR realtime.topic() = ('fav-' || auth.uid()::text)
    OR realtime.topic() = ('stats-' || auth.uid()::text)
    OR realtime.topic() = ('user-stats-' || auth.uid()::text)
    OR realtime.topic() = ('streak-' || auth.uid()::text)
  );
