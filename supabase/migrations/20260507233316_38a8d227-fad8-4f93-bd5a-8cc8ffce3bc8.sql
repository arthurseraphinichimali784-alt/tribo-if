
REVOKE EXECUTE ON FUNCTION public.handle_material_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_material() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_material_download_bump() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
