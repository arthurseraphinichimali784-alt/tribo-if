
-- ============ ANALYTICS ============
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_type_time ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX idx_events_user_time ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX idx_events_entity ON public.analytics_events(entity_type, entity_id);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_insert_any" ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "events_select_own_or_admin" ON public.analytics_events FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ MATERIAL VIEWS ============
CREATE TABLE public.material_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_views_material ON public.material_views(material_id, created_at DESC);
CREATE INDEX idx_views_user ON public.material_views(user_id, created_at DESC);
ALTER TABLE public.material_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views_insert_any" ON public.material_views FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "views_select_own_or_admin" ON public.material_views FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ FAVORITES counter on materials ============
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS saves_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_favorite_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.materials SET saves_count = saves_count + 1 WHERE id = NEW.material_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.materials SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.material_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;
DROP TRIGGER IF EXISTS trg_favorite_change ON public.favorites;
CREATE TRIGGER trg_favorite_change AFTER INSERT OR DELETE ON public.favorites
FOR EACH ROW EXECUTE FUNCTION public.handle_favorite_change();

CREATE OR REPLACE FUNCTION public.handle_view_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.materials SET views_count = views_count + 1 WHERE id = NEW.material_id;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_view_insert ON public.material_views;
CREATE TRIGGER trg_view_insert AFTER INSERT ON public.material_views
FOR EACH ROW EXECUTE FUNCTION public.handle_view_insert();

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  likes integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_material ON public.comments(material_id, created_at DESC);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own_or_pin_author" ON public.comments FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = (SELECT author_id FROM public.materials WHERE id = material_id));
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clikes_select_all" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "clikes_insert_own" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clikes_delete_own" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_comment_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.comments SET likes = likes + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.comments SET likes = GREATEST(0, likes - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_comment_like AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_comment_like();

-- ============ STREAKS ============
CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_select_all" ON public.user_streaks FOR SELECT USING (true);
CREATE POLICY "streaks_upsert_own" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_update_own" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_streak(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  s public.user_streaks%ROWTYPE;
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT * INTO s FROM public.user_streaks WHERE user_id=_user;
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks(user_id, current_streak, longest_streak, last_activity_date)
    VALUES(_user, 1, 1, today);
    RETURN;
  END IF;
  IF s.last_activity_date = today THEN RETURN; END IF;
  IF s.last_activity_date = today - 1 THEN
    UPDATE public.user_streaks
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_activity_date = today, updated_at = now()
      WHERE user_id = _user;
  ELSE
    UPDATE public.user_streaks
      SET current_streak = 1, last_activity_date = today, updated_at = now()
      WHERE user_id = _user;
  END IF;
END;$$;

-- Trigger streak when an analytics event is recorded by a logged user
CREATE OR REPLACE FUNCTION public.on_event_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.bump_streak(NEW.user_id);
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_event_streak AFTER INSERT ON public.analytics_events
FOR EACH ROW EXECUTE FUNCTION public.on_event_streak();

-- ============ BADGES ============
CREATE TABLE public.badges (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  icon text,
  color text DEFAULT 'primary'
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code text NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_select_all" ON public.user_badges FOR SELECT USING (true);

INSERT INTO public.badges(code,label,description,icon,color) VALUES
  ('first_upload','Primeiro Upload','Publicou seu primeiro material','upload','primary'),
  ('liked_10','Querido pela comunidade','Recebeu 10 likes','heart','accent'),
  ('streak_7','Foco semanal','7 dias seguidos de atividade','flame','warning'),
  ('streak_30','Disciplina','30 dias seguidos','flame','destructive'),
  ('specialist','Especialista','100 pontos numa matéria','award','primary')
ON CONFLICT DO NOTHING;

-- ============ REALTIME ============
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.comment_likes REPLICA IDENTITY FULL;
ALTER TABLE public.favorites REPLICA IDENTITY FULL;
ALTER TABLE public.user_streaks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_streaks;
