
-- ============ 1. MATERIALS: classificação educacional ============
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS school_year text,
  ADD COLUMN IF NOT EXISTS goals text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_materials_level ON public.materials(level);
CREATE INDEX IF NOT EXISTS idx_materials_topics ON public.materials USING gin(topics);
CREATE INDEX IF NOT EXISTS idx_materials_goals ON public.materials USING gin(goals);

-- ============ 2. KITS ============
CREATE TABLE IF NOT EXISTS public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  price numeric NOT NULL DEFAULT 0,
  subject public.subject,
  level text,
  difficulty public.difficulty NOT NULL DEFAULT 'medio',
  topics text[] NOT NULL DEFAULT '{}',
  goals text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  rating numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT ALL ON public.kits TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kits_public_read" ON public.kits;
CREATE POLICY "kits_public_read" ON public.kits FOR SELECT
  USING (published = true OR author_id = auth.uid());
DROP POLICY IF EXISTS "kits_owner_insert" ON public.kits;
CREATE POLICY "kits_owner_insert" ON public.kits FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "kits_owner_update" ON public.kits;
CREATE POLICY "kits_owner_update" ON public.kits FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "kits_owner_delete" ON public.kits;
CREATE POLICY "kits_owner_delete" ON public.kits FOR DELETE TO authenticated
  USING (author_id = auth.uid());
DROP TRIGGER IF EXISTS trg_kits_updated_at ON public.kits;
CREATE TRIGGER trg_kits_updated_at BEFORE UPDATE ON public.kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.kit_items (
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kit_id, material_id)
);
GRANT SELECT ON public.kit_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_items TO authenticated;
GRANT ALL ON public.kit_items TO service_role;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kit_items_read" ON public.kit_items;
CREATE POLICY "kit_items_read" ON public.kit_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND (k.published OR k.author_id = auth.uid())));
DROP POLICY IF EXISTS "kit_items_owner_write" ON public.kit_items;
CREATE POLICY "kit_items_owner_write" ON public.kit_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.author_id = auth.uid()));

-- ============ 3. PURCHASES: suporte a kit ============
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL;
ALTER TABLE public.purchases ALTER COLUMN material_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_kit ON public.purchases(kit_id);

-- acesso: autor, admin, gratuito, compra paga do material OU de um kit que contém o material
CREATE OR REPLACE FUNCTION public.has_material_access(_user_id uuid, _material_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF _user_id IS NULL OR _material_id IS NULL THEN RETURN false; END IF;

  v_is_admin := EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role = 'admin');

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
        OR EXISTS (
          SELECT 1
          FROM public.purchases p
          JOIN public.kit_items ki ON ki.kit_id = p.kit_id
          WHERE p.buyer_id = _user_id AND p.status = 'pago' AND ki.material_id = _material_id
        )
      )
  );
END $function$;

-- ============ 4. QUESTÕES (acesso apenas via servidor) ============
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject public.subject NOT NULL,
  topic text,
  statement text NOT NULL,
  explanation text,
  difficulty public.difficulty NOT NULL DEFAULT 'medio',
  institution text,
  exam_year integer,
  tags text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  content text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.question_options TO service_role;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_question_options_q ON public.question_options(question_id);

CREATE TABLE IF NOT EXISTS public.question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'lista',
  subject public.subject,
  topics text[] NOT NULL DEFAULT '{}',
  difficulty public.difficulty NOT NULL DEFAULT 'medio',
  institution text,
  time_limit_minutes integer,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_sets TO anon;
GRANT SELECT ON public.question_sets TO authenticated;
GRANT ALL ON public.question_sets TO service_role;
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "question_sets_read" ON public.question_sets;
CREATE POLICY "question_sets_read" ON public.question_sets FOR SELECT
  USING (published = true OR author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.question_set_items (
  set_id uuid NOT NULL REFERENCES public.question_sets(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (set_id, question_id)
);
GRANT ALL ON public.question_set_items TO service_role;
ALTER TABLE public.question_set_items ENABLE ROW LEVEL SECURITY;

-- ============ 5. TENTATIVAS ============
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id uuid REFERENCES public.question_sets(id) ON DELETE SET NULL,
  total integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quiz_attempts_own" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_own" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_id uuid,
  is_correct boolean NOT NULL DEFAULT false,
  subject public.subject,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quiz_answers_own" ON public.quiz_answers;
CREATE POLICY "quiz_answers_own" ON public.quiz_answers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_quiz_answers_user_topic ON public.quiz_answers(user_id, subject, topic);

-- ============ 6. PROGRESSO POR ASSUNTO ============
CREATE TABLE IF NOT EXISTS public.topic_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject public.subject NOT NULL,
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'nao_iniciado',
  percent integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject, topic)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_progress TO authenticated;
GRANT ALL ON public.topic_progress TO service_role;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "topic_progress_own" ON public.topic_progress;
CREATE POLICY "topic_progress_own" ON public.topic_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_topic_progress_updated_at ON public.topic_progress;
CREATE TRIGGER trg_topic_progress_updated_at BEFORE UPDATE ON public.topic_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 7. TRILHAS DE PROVA ============
CREATE TABLE IF NOT EXISTS public.exam_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  institution text,
  level text,
  published boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exam_tracks TO anon, authenticated;
GRANT ALL ON public.exam_tracks TO service_role;
ALTER TABLE public.exam_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exam_tracks_read" ON public.exam_tracks;
CREATE POLICY "exam_tracks_read" ON public.exam_tracks FOR SELECT USING (published = true);
DROP POLICY IF EXISTS "exam_tracks_admin" ON public.exam_tracks;
CREATE POLICY "exam_tracks_admin" ON public.exam_tracks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.track_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.exam_tracks(id) ON DELETE CASCADE,
  subject public.subject NOT NULL,
  topic text NOT NULL,
  position integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.track_topics TO anon, authenticated;
GRANT ALL ON public.track_topics TO service_role;
ALTER TABLE public.track_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "track_topics_read" ON public.track_topics;
CREATE POLICY "track_topics_read" ON public.track_topics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.exam_tracks t WHERE t.id = track_id AND t.published));
DROP POLICY IF EXISTS "track_topics_admin" ON public.track_topics;
CREATE POLICY "track_topics_admin" ON public.track_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ 8. AVALIAÇÕES ============
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  kit_id uuid REFERENCES public.kits(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  quality integer,
  clarity integer,
  value_rating integer,
  comment text,
  verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_one_target CHECK (num_nonnulls(material_id, kit_id) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_material ON public.reviews(user_id, material_id) WHERE material_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_kit ON public.reviews(user_id, kit_id) WHERE kit_id IS NOT NULL;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_read" ON public.reviews;
CREATE POLICY "reviews_read" ON public.reviews FOR SELECT USING (true);
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recalc_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_material uuid := COALESCE(NEW.material_id, OLD.material_id);
  v_kit uuid := COALESCE(NEW.kit_id, OLD.kit_id);
BEGIN
  IF v_material IS NOT NULL THEN
    UPDATE public.materials m SET
      rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r WHERE r.material_id = v_material), 0),
      rating_count = (SELECT COUNT(*) FROM public.reviews r WHERE r.material_id = v_material)
    WHERE m.id = v_material;
  END IF;
  IF v_kit IS NOT NULL THEN
    UPDATE public.kits k SET
      rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r WHERE r.kit_id = v_kit), 0),
      rating_count = (SELECT COUNT(*) FROM public.reviews r WHERE r.kit_id = v_kit)
    WHERE k.id = v_kit;
  END IF;
  RETURN NULL;
END $function$;

DROP TRIGGER IF EXISTS trg_reviews_stats ON public.reviews;
CREATE TRIGGER trg_reviews_stats AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalc_review_stats();
