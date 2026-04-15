-- ============================================================
-- KIMURA TEAM MANAGER — Patch para schema existente
-- Corre este ficheiro no SQL Editor do teu projeto Supabase
-- ============================================================

-- ============================================================
-- 1. CORRIGIR RLS RECURSIVO (apaga todas as políticas actuais)
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 2. ADICIONAR COLUNAS EM FALTA À TABELA profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email     text,
  ADD COLUMN IF NOT EXISTS phone     text,
  ADD COLUMN IF NOT EXISTS weight    text,
  ADD COLUMN IF NOT EXISTS category  text DEFAULT 'Adulto',
  ADD COLUMN IF NOT EXISTS join_date date DEFAULT current_date;

-- ============================================================
-- 3. CRIAR TABELAS QUE FALTAM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tournaments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  date       date NOT NULL,
  location   text NOT NULL,
  category   text NOT NULL DEFAULT 'Gi',
  status     text NOT NULL DEFAULT 'Programado',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_participants (
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  student_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.tournament_rankings (
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  student_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  position      integer NOT NULL,
  PRIMARY KEY (tournament_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_text text NOT NULL
);

-- ============================================================
-- 4. RECRIAR RLS — políticas simples (permissivas para protótipo)
-- ============================================================
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_fees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rankings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements           ENABLE ROW LEVEL SECURITY;

-- Permitir tudo a utilizadores autenticados (protótipo)
CREATE POLICY "auth_all" ON public.profiles               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.monthly_fees           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.enrollments            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.classes                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.attendance             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.class_templates        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.tournaments            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.tournament_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.tournament_rankings    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.achievements           FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. PERFIL INICIAL DO PROFESSOR
-- (só correr se ainda não existir)
-- ============================================================
INSERT INTO public.profiles (role, full_name, email, category, join_date)
VALUES ('teacher', 'Professor Carlos Silva', 'professor@academia.com', 'Professor', '2010-01-01')
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTAS FINAIS:
-- 1. Vai a Authentication > Providers > Email e DESATIVA
--    "Confirm email" para login funcionar imediatamente.
-- 2. Vai a Authentication > Users > "Add user" e cria:
--    Email: professor@academia.com | Password: professor123
--    Depois o login liga automaticamente ao perfil pelo email.
-- ============================================================
