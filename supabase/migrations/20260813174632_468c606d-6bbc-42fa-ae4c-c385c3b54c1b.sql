CREATE OR REPLACE FUNCTION public.notify_new_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_name text;
  v_actor_username text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Alguém'), username INTO v_actor_name, v_actor_username
    FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications(user_id, actor_id, type, title, link)
  VALUES (NEW.following_id, NEW.follower_id, 'follow',
          v_actor_name || ' começou a te seguir',
          '/u/' || COALESCE(v_actor_username, NEW.follower_id::text));
  RETURN NEW;
END;$function$;