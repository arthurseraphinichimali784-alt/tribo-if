-- =========================================================
-- ENUMS
-- =========================================================
DO $$ BEGIN CREATE TYPE public.user_kind AS ENUM ('aluno','professor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.verification_status AS ENUM ('nao_verificado','pendente','verificado','rejeitado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.verification_method AS ENUM ('email_institucional','documento','analise_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.purchase_status AS ENUM ('pendente','pago','cancelado','reembolsado','falhou'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.material_access_kind AS ENUM ('preview','view','download'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- PROFILES: campos de professor / verificação
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type public.user_kind NOT NULL DEFAULT 'aluno',
  ADD COLUMN IF NOT EXISTS teaching_area text,
  ADD COLUMN IF NOT EXISTS teaching_role text,
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'nao_verificado',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_method public.verification_method;

UPDATE public.profiles SET user_type = 'professor' WHERE is_teacher AND user_type <> 'professor';

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Chamadas server-side (service role) não têm auth.uid(): liberadas.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.verification_status := OLD.verification_status;
  NEW.verified_at := OLD.verified_at;
  NEW.verification_method := OLD.verification_method;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- =========================================================
-- MATERIALS: prévia + proteção de campos sensíveis
-- =========================================================
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS preview_pages integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.protect_material_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN RETURN NEW; END IF;
  NEW.author_id := OLD.author_id;
  NEW.downloads := OLD.downloads;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_material_fields ON public.materials;
CREATE TRIGGER trg_protect_material_fields
BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.protect_material_fields();

-- =========================================================
-- PLATFORM SETTINGS (taxa configurável)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  platform_fee_percent numeric NOT NULL DEFAULT 5 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_select_all ON public.platform_settings;
CREATE POLICY settings_select_all ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- TEACHER VERIFICATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.teacher_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution text NOT NULL,
  teaching_area text NOT NULL,
  teaching_role text,
  institutional_email text,
  institutional_email_verified boolean NOT NULL DEFAULT false,
  email_code_hash text,
  email_code_expires_at timestamptz,
  document_path text,
  verification_method public.verification_method NOT NULL DEFAULT 'analise_admin',
  status public.verification_status NOT NULL DEFAULT 'pendente',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_verifications_one_pending
  ON public.teacher_verifications (user_id) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS teacher_verifications_status_idx ON public.teacher_verifications (status, created_at DESC);

GRANT SELECT, INSERT ON public.teacher_verifications TO authenticated;
GRANT ALL ON public.teacher_verifications TO service_role;
ALTER TABLE public.teacher_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tv_select_own_or_admin ON public.teacher_verifications;
CREATE POLICY tv_select_own_or_admin ON public.teacher_verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS tv_insert_own_pending ON public.teacher_verifications;
CREATE POLICY tv_insert_own_pending ON public.teacher_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pendente'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
    AND institutional_email_verified = false
    AND (document_path IS NULL OR document_path LIKE (auth.uid())::text || '/%')
  );

-- Nenhuma policy de UPDATE/DELETE: só o servidor (service role) altera.

DROP TRIGGER IF EXISTS trg_tv_updated_at ON public.teacher_verifications;
CREATE TRIGGER trg_tv_updated_at BEFORE UPDATE ON public.teacher_verifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- PURCHASES / LICENÇAS
-- =========================================================
CREATE OR REPLACE FUNCTION public.gen_license_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := 'SH-';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.purchases WHERE license_code = code);
  END LOOP;
  RETURN code;
END $$;

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_code text NOT NULL UNIQUE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  platform_fee numeric NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  platform_fee_percent numeric NOT NULL DEFAULT 0 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  status public.purchase_status NOT NULL DEFAULT 'pendente',
  payment_provider text,
  external_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS purchases_active_unique
  ON public.purchases (buyer_id, material_id) WHERE status IN ('pendente','pago');
CREATE INDEX IF NOT EXISTS purchases_buyer_idx ON public.purchases (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS purchases_author_idx ON public.purchases (author_id, created_at DESC);

GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchases_select_own ON public.purchases;
CREATE POLICY purchases_select_own ON public.purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
-- Sem policies de INSERT/UPDATE/DELETE: escrita apenas server-side.

DROP TRIGGER IF EXISTS trg_purchases_updated_at ON public.purchases;
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- CONTROLE DE ACESSO
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_material_access(_user_id uuid, _material_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF _user_id IS NULL OR _material_id IS NULL THEN RETURN false; END IF;

  v_is_admin := EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role = 'admin');

  -- Só é permitido consultar o próprio acesso (ou tudo, se admin / server-side).
  IF v_caller IS NOT NULL AND v_caller <> _user_id AND NOT v_is_admin THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.materials m
    WHERE m.id = _material_id
      AND (
        m.author_id = _user_id
        OR m.price <= 0
        OR EXISTS (
          SELECT 1 FROM public.purchases p
          WHERE p.material_id = _material_id AND p.buyer_id = _user_id AND p.status = 'pago'
        )
      )
  );
END $$;

REVOKE ALL ON FUNCTION public.has_material_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_material_access(uuid, uuid) TO authenticated, service_role;

-- =========================================================
-- PROGRESSO DE ESTUDO
-- =========================================================
CREATE TABLE IF NOT EXISTS public.material_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_page integer NOT NULL DEFAULT 0 CHECK (last_page >= 0),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, material_id)
);
CREATE INDEX IF NOT EXISTS material_progress_recent_idx ON public.material_progress (user_id, last_accessed_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.material_progress TO authenticated;
GRANT ALL ON public.material_progress TO service_role;
ALTER TABLE public.material_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mp_select_own ON public.material_progress;
CREATE POLICY mp_select_own ON public.material_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS mp_insert_own ON public.material_progress;
CREATE POLICY mp_insert_own ON public.material_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_material_access(auth.uid(), material_id));
DROP POLICY IF EXISTS mp_update_own ON public.material_progress;
CREATE POLICY mp_update_own ON public.material_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_mp_updated_at ON public.material_progress;
CREATE TRIGGER trg_mp_updated_at BEFORE UPDATE ON public.material_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- LOG DE ACESSO A ARQUIVOS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.material_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  license_code text,
  access_type public.material_access_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mal_user_idx ON public.material_access_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mal_material_idx ON public.material_access_log (material_id, created_at DESC);

GRANT SELECT ON public.material_access_log TO authenticated;
GRANT ALL ON public.material_access_log TO service_role;
ALTER TABLE public.material_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mal_select_own_or_admin ON public.material_access_log;
CREATE POLICY mal_select_own_or_admin ON public.material_access_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- SESSÕES (telemetria mínima, sem bloqueio)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  device_type text,
  browser text,
  os text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_key)
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON public.user_sessions (user_id, last_seen_at DESC);

GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS us_select_own_or_admin ON public.user_sessions;
CREATE POLICY us_select_own_or_admin ON public.user_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- DENÚNCIAS: denunciante acompanha as próprias
-- =========================================================
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- =========================================================
-- STORAGE: materiais exigem licença; documentos privados
-- =========================================================
DROP POLICY IF EXISTS materials_read_anon_published ON storage.objects;
DROP POLICY IF EXISTS materials_read_owner_or_published ON storage.objects;

CREATE POLICY materials_read_licensed ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materials'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.file_path = storage.objects.name
          AND m.published = true
          AND public.has_material_access(auth.uid(), m.id)
      )
    )
  );

DROP POLICY IF EXISTS verdocs_insert_own ON storage.objects;
CREATE POLICY verdocs_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS verdocs_read_own_or_admin ON storage.objects;
CREATE POLICY verdocs_read_own_or_admin ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );