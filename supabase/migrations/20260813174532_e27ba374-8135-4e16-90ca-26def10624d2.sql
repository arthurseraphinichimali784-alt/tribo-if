CREATE OR REPLACE FUNCTION public.notify_new_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          COALESCE(LEFT(NEW.body, 140), v_mat_title),
          '/material/' || NEW.material_id,
          NEW.material_id, NEW.id);
  RETURN NEW;
END;$function$;