REVOKE ALL ON FUNCTION public.gen_license_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_material_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gen_license_code() TO service_role;