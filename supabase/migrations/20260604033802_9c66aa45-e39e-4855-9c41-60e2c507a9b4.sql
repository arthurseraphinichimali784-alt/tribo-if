-- 1) Limpa todas as contas existentes (cascade remove profiles, roles, materials, etc.)
DELETE FROM auth.users;

-- 2) Cria a conta admin
WITH new_user AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'arthurseraphinichimali@gmail.com',
    crypt('01187411Arthur!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"arthur","full_name":"Arthur","is_teacher":false}'::jsonb,
    '', '', '', ''
  )
  RETURNING id, email
)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT gen_random_uuid(), nu.id,
       jsonb_build_object('sub', nu.id::text, 'email', nu.email, 'email_verified', true),
       'email', nu.id::text,
       now(), now(), now()
FROM new_user nu;

-- 3) Promove a admin (o trigger handle_new_user já criou profile + role student)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'arthurseraphinichimali@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;