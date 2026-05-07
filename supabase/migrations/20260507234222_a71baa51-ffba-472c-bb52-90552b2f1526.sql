
-- Drop duplicate FK to fix PostgREST embedding ambiguity
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_author_id_fkey;

-- Enable realtime
ALTER TABLE public.materials REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.material_likes REPLICA IDENTITY FULL;
ALTER TABLE public.subject_scores REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.material_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.subject_scores;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
