DROP POLICY IF EXISTS comments_update_own_or_pin_author ON public.comments;

CREATE POLICY comments_update_own ON public.comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.toggle_comment_pin(_comment_id uuid, _pinned boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _material uuid; _author uuid;
BEGIN
  SELECT c.material_id INTO _material FROM public.comments c WHERE c.id = _comment_id;
  IF _material IS NULL THEN RAISE EXCEPTION 'Comentário não encontrado'; END IF;
  SELECT m.author_id INTO _author FROM public.materials m WHERE m.id = _material;
  IF _author IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.comments SET is_pinned = _pinned WHERE id = _comment_id;
  RETURN _pinned;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_comment_pin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_comment_pin(uuid, boolean) TO authenticated;