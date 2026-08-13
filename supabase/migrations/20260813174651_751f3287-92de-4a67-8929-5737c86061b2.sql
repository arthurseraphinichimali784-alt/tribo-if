CREATE OR REPLACE FUNCTION public.notify_new_badge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_badge_label text;
BEGIN
  SELECT label INTO v_badge_label FROM public.badges WHERE code = NEW.badge_code;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.user_id, 'badge',
          'Novo badge desbloqueado: ' || COALESCE(v_badge_label, 'Conquista'),
          'Continue assim!',
          '/u/me');
  RETURN NEW;
END;$function$;