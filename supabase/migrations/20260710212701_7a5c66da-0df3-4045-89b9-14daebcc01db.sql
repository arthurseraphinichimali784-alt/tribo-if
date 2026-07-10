
-- Restaurar SELECT amplo para viabilizar embeds PostgREST (profiles(username,avatar_url))
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;

CREATE POLICY profiles_select_public
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Reset e re-grant SELECT em colunas seguras apenas.
-- `state` fica fora — só o próprio dono lê via função abaixo.
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT
  (id, username, full_name, avatar_url, bio, is_teacher,
   institute, hourly_rate, created_at, updated_at,
   trust_score, xp, level)
  ON public.profiles
  TO anon, authenticated;

GRANT ALL ON public.profiles TO service_role;

-- Função para o dono ler o próprio perfil completo (inclui state)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
