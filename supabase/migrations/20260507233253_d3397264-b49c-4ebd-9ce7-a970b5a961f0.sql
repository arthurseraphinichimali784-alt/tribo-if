
-- 1) Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- 2) Extend materials
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score_recebido numeric NOT NULL DEFAULT 0;

-- 3) FK from materials.author_id -> profiles.id (enables PostgREST embedding)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'materials_author_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.materials
      ADD CONSTRAINT materials_author_id_profiles_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Subject scores (specialist badges)
CREATE TABLE IF NOT EXISTS public.subject_scores (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject public.subject NOT NULL,
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject)
);
ALTER TABLE public.subject_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_scores_select_all" ON public.subject_scores;
CREATE POLICY "subject_scores_select_all" ON public.subject_scores FOR SELECT USING (true);

-- 5) Material likes
CREATE TABLE IF NOT EXISTS public.material_likes (
  user_id uuid NOT NULL,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, material_id)
);
ALTER TABLE public.material_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes_select_all" ON public.material_likes;
DROP POLICY IF EXISTS "likes_insert_own" ON public.material_likes;
DROP POLICY IF EXISTS "likes_delete_own" ON public.material_likes;
CREATE POLICY "likes_select_all" ON public.material_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.material_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.material_likes FOR DELETE USING (auth.uid() = user_id);

-- 6) Trigger: handle likes -> updates counters + trust + xp + subject scores
CREATE OR REPLACE FUNCTION public.handle_material_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
  v_subject public.subject;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.materials
      SET likes = likes + 1,
          trust_score_recebido = trust_score_recebido + 1
      WHERE id = NEW.material_id
      RETURNING author_id, subject INTO v_author, v_subject;

    IF v_author IS NOT NULL THEN
      UPDATE public.profiles
        SET trust_score = trust_score + 1,
            xp = xp + 5,
            level = ((xp + 5) / 100) + 1
        WHERE id = v_author;

      INSERT INTO public.subject_scores (user_id, subject, score)
        VALUES (v_author, v_subject, 1)
        ON CONFLICT (user_id, subject)
        DO UPDATE SET score = public.subject_scores.score + 1, updated_at = now();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.materials
      SET likes = GREATEST(0, likes - 1),
          trust_score_recebido = GREATEST(0, trust_score_recebido - 1)
      WHERE id = OLD.material_id
      RETURNING author_id, subject INTO v_author, v_subject;

    IF v_author IS NOT NULL THEN
      UPDATE public.profiles
        SET trust_score = GREATEST(0, trust_score - 1)
        WHERE id = v_author;
      UPDATE public.subject_scores
        SET score = GREATEST(0, score - 1), updated_at = now()
        WHERE user_id = v_author AND subject = v_subject;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS material_likes_aiud ON public.material_likes;
CREATE TRIGGER material_likes_aiud
AFTER INSERT OR DELETE ON public.material_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_material_like();

-- 7) Trigger: +XP on new material
CREATE OR REPLACE FUNCTION public.handle_new_material()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
    SET xp = xp + 10,
        level = ((xp + 10) / 100) + 1
    WHERE id = NEW.author_id;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS materials_after_insert ON public.materials;
CREATE TRIGGER materials_after_insert
AFTER INSERT ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.handle_new_material();

-- 8) Trigger: bump downloads -> tiny xp & trust to author (optional but useful)
CREATE OR REPLACE FUNCTION public.handle_material_download_bump()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.downloads > OLD.downloads THEN
    UPDATE public.profiles
      SET trust_score = trust_score + 0.5,
          xp = xp + 2,
          level = ((xp + 2) / 100) + 1
      WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS materials_downloads_bump ON public.materials;
CREATE TRIGGER materials_downloads_bump
AFTER UPDATE OF downloads ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.handle_material_download_bump();
