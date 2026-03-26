-- ═══════════════════════════════════════════════════════════
--  FumuGold V4 — Criar Utilizadores no Supabase Auth
--  Corre isto no SQL Editor do teu projecto Supabase
--  ANTES de qualquer login no FumuGold
-- ═══════════════════════════════════════════════════════════

-- ── PASSO 1: Desactiva confirmação de email (para dev) ────
-- Vai a: Authentication → Settings → Email → "Confirm email" → OFF
-- (em produção real, mantém ON e configura SMTP)

-- ── PASSO 2: Cria os utilizadores ────────────────────────

-- Admin principal
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  gen_random_uuid(),
  'admin@fumugold.ao',                                          -- ← muda o email
  crypt('FumuGold2025!Seguro', gen_salt('bf')),                 -- ← muda a password
  NOW(),
  '{"name": "Administrador", "role": "admin"}'::jsonb,
  'authenticated',
  NOW(),
  NOW(),
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Médico exemplo
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, created_at, updated_at,
  confirmation_token, recovery_token
) VALUES (
  gen_random_uuid(),
  'medico@fumugold.ao',                                         -- ← muda o email
  crypt('Medico2025!', gen_salt('bf')),                         -- ← muda a password
  NOW(),
  '{"name": "Dr. António Santos", "role": "medico"}'::jsonb,
  'authenticated',
  NOW(), NOW(), '', ''
) ON CONFLICT (email) DO NOTHING;

-- Enfermeiro exemplo
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, created_at, updated_at,
  confirmation_token, recovery_token
) VALUES (
  gen_random_uuid(),
  'enfermeiro@fumugold.ao',
  crypt('Enfer2025!', gen_salt('bf')),
  NOW(),
  '{"name": "Enf. Rosa Baptista", "role": "enfermeiro"}'::jsonb,
  'authenticated',
  NOW(), NOW(), '', ''
) ON CONFLICT (email) DO NOTHING;

-- ── PASSO 3: Verificar utilizadores criados ───────────────
SELECT id, email, raw_user_meta_data->>'name' AS nome,
       raw_user_meta_data->>'role' AS papel, created_at
FROM auth.users
WHERE email LIKE '%fumugold%'
ORDER BY created_at DESC;

-- ════════════════════════════════════════════════════════════
--  GESTÃO DE UTILIZADORES (usar depois)
-- ════════════════════════════════════════════════════════════

-- Listar todos os utilizadores:
-- SELECT id, email, raw_user_meta_data, last_sign_in_at FROM auth.users;

-- Mudar password:
-- UPDATE auth.users SET encrypted_password = crypt('NovaPass!', gen_salt('bf'))
-- WHERE email = 'admin@fumugold.ao';

-- Desactivar utilizador:
-- UPDATE auth.users SET banned_until = '2099-01-01' WHERE email = 'ex@fumugold.ao';

-- Eliminar utilizador:
-- DELETE FROM auth.users WHERE email = 'ex@fumugold.ao';
