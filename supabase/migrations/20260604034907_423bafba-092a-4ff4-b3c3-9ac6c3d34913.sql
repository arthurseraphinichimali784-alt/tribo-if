-- ============ NOTIFICATIONS ============
CREATE TYPE public.notification_type AS ENUM (
  'comment','reply','like','follow','badge','report_resolved','material_featured','system'
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read = false;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============ TRIGGERS: criar notificações automaticamente ============

-- Like em material
CREATE OR REPLACE FUNCTION public.notify_material_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_title text;
  v_actor_name text;
BEGIN
  SELECT m.author_id, m.title INTO v_author, v_title
    FROM public.materials m WHERE m.id = NEW.material_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Alguém') INTO v_actor_name
    FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications(user_id, actor_id, type, title, body, link, material_id)
  VALUES (v_author, NEW.user_id, 'like',
          v_actor_name || ' curtiu seu material',
          v_title,
          '/material/' || NEW.material_id,
          NEW.material_id);
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_material_like
  AFTER INSERT ON public.material_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_material_like();

-- Comentário em material (ou resposta a comentário)
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target uuid;
  v_kind public.notification_type;
  v_title text;
  v_actor_name text;
  v_mat_title text;
BEGIN
  SELECT COALESCE(full_name, username, 'Alguém') INTO v_actor_name
    FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO v_mat_title FROM public.materials WHERE id = NEW.material_id;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_target FROM public.comments WHERE id = NEW.parent_id;
    v_kind := 'reply';
    v_title := v_actor_name || ' respondeu seu comentário';
  ELSE
    SELECT author_id INTO v_target FROM public.materials WHERE id = NEW.material_id;
    v_kind := 'comment';
    v_title := v_actor_name || ' comentou no seu material';
  END IF;

  IF v_target IS NULL OR v_target = NEW.user_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications(user_id, actor_id, type, title, body, link, material_id, comment_id)
  VALUES (v_target, NEW.user_id, v_kind, v_title,
          COALESCE(LEFT(NEW.content, 140), v_mat_title),
          '/material/' || NEW.material_id,
          NEW.material_id, NEW.id);
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_comment();

-- Novo seguidor
CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_name text;
  v_actor_username text;
BEGIN
  IF NEW.follower_id = NEW.followee_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Alguém'), username INTO v_actor_name, v_actor_username
    FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications(user_id, actor_id, type, title, link)
  VALUES (NEW.followee_id, NEW.follower_id, 'follow',
          v_actor_name || ' começou a te seguir',
          '/u/' || COALESCE(v_actor_username, NEW.follower_id::text));
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_follow();

-- Novo badge
CREATE OR REPLACE FUNCTION public.notify_new_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_badge_name text;
BEGIN
  SELECT name INTO v_badge_name FROM public.badges WHERE id = NEW.badge_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.user_id, 'badge',
          'Novo badge desbloqueado: ' || COALESCE(v_badge_name, 'Conquista'),
          'Continue assim!',
          '/u/me');
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_new_badge
  AFTER INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_badge();

-- ============ REPORTS (denúncias) ============
CREATE TYPE public.report_target AS ENUM ('material','comment','user');
CREATE TYPE public.report_status AS ENUM ('pending','resolved','rejected');

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  details text CHECK (details IS NULL OR char_length(details) <= 2000),
  status public.report_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status_created ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users create own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "users see own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notificar denunciante quando resolvido
CREATE OR REPLACE FUNCTION public.notify_report_resolved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('resolved','rejected') THEN
    INSERT INTO public.notifications(user_id, type, title, body)
    VALUES (NEW.reporter_id, 'report_resolved',
            'Sua denúncia foi revisada',
            CASE WHEN NEW.status = 'resolved'
                 THEN 'Obrigado! Tomamos as providências necessárias.'
                 ELSE 'Analisamos sua denúncia e decidimos não tomar ação.' END);
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_report_resolved
  AFTER UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_report_resolved();