ALTER TYPE public.subject ADD VALUE IF NOT EXISTS 'fisica';
ALTER TYPE public.subject ADD VALUE IF NOT EXISTS 'quimica';
ALTER TYPE public.subject ADD VALUE IF NOT EXISTS 'biologia';

ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

UPDATE public.materials m
  SET comments_count = c.n
  FROM (SELECT material_id, count(*)::int AS n FROM public.comments GROUP BY material_id) c
  WHERE c.material_id = m.id;

CREATE OR REPLACE FUNCTION public.handle_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.materials SET comments_count = comments_count + 1 WHERE id = NEW.material_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.materials SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.material_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS trg_comment_count ON public.comments;
CREATE TRIGGER trg_comment_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_comment_count();

CREATE INDEX IF NOT EXISTS materials_topics_idx ON public.materials USING gin (topics);
CREATE INDEX IF NOT EXISTS materials_subject_idx ON public.materials (subject);
CREATE INDEX IF NOT EXISTS materials_created_at_idx ON public.materials (created_at DESC);