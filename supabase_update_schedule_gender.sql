-- ============================================================
-- Brazilian Power Team - gender restrictions + recurring schedule
-- Safe to run more than once in Supabase SQL Editor.
-- Apply this before deploying the matching frontend code.
-- ============================================================

BEGIN;

-- 1. Add schema needed by the app.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.class_templates
  ADD COLUMN IF NOT EXISTS allowed_genders text[] DEFAULT '{}'::text[];

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS allowed_genders text[] DEFAULT '{}'::text[];

UPDATE public.class_templates
SET allowed_genders = '{}'::text[]
WHERE allowed_genders IS NULL;

UPDATE public.classes
SET allowed_genders = '{}'::text[]
WHERE allowed_genders IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_gender_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IS NULL OR gender IN ('MASCULINO', 'FEMININO'));
  END IF;
END $$;

-- 2. Desired active weekly templates.
WITH desired_templates AS (
  SELECT *
  FROM (
    VALUES
      -- name, weekday, start_time, end_time, allowed_groups, allowed_genders, min_belt
      ('Aula Adulto', 1, '09:00:00'::time, '10:00:00'::time, ARRAY['ADULTO']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Kids', 1, '18:30:00'::time, '19:15:00'::time, ARRAY['KIDS']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Avancado', 1, '19:30:00'::time, '20:30:00'::time, ARRAY['JUVENIL','ADULTO','MASTER']::public.age_group[], ARRAY[]::text[], 'AZUL'::public.belt),

      ('Aula Adulto', 2, '09:00:00'::time, '10:00:00'::time, ARRAY['ADULTO']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Kids', 2, '18:30:00'::time, '19:15:00'::time, ARRAY['KIDS']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Juvenil', 2, '19:15:00'::time, '20:15:00'::time, ARRAY['INFANTO_JUVENIL','JUVENIL']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Adulto', 2, '20:15:00'::time, '21:15:00'::time, ARRAY['JUVENIL','ADULTO','MASTER']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),

      ('Aula Adulto', 3, '09:00:00'::time, '10:00:00'::time, ARRAY['ADULTO']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Kids', 3, '18:30:00'::time, '19:15:00'::time, ARRAY['KIDS']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Avancado', 3, '19:30:00'::time, '20:30:00'::time, ARRAY['JUVENIL','ADULTO','MASTER']::public.age_group[], ARRAY[]::text[], 'AZUL'::public.belt),

      ('Aula Adulto', 4, '09:00:00'::time, '10:00:00'::time, ARRAY['ADULTO']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Kids', 4, '18:30:00'::time, '19:15:00'::time, ARRAY['KIDS']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Juvenil', 4, '19:15:00'::time, '20:15:00'::time, ARRAY['INFANTO_JUVENIL','JUVENIL']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Adulto', 4, '20:15:00'::time, '21:15:00'::time, ARRAY['JUVENIL','ADULTO','MASTER']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),

      ('Aula Adulto', 5, '09:00:00'::time, '10:00:00'::time, ARRAY['ADULTO']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Kids', 5, '18:30:00'::time, '19:15:00'::time, ARRAY['KIDS']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Adulto', 5, '20:15:00'::time, '21:15:00'::time, ARRAY['JUVENIL','ADULTO','MASTER']::public.age_group[], ARRAY[]::text[], 'BRANCA'::public.belt),
      ('Aula Avancado', 5, '20:15:00'::time, '21:15:00'::time, ARRAY['JUVENIL','ADULTO','MASTER']::public.age_group[], ARRAY[]::text[], 'AZUL'::public.belt),

      ('Aula Feminina', 6, '10:00:00'::time, '11:00:00'::time, ARRAY['JUVENIL','ADULTO','MASTER']::public.age_group[], ARRAY['FEMININO']::text[], 'BRANCA'::public.belt)
  ) AS template(name, weekday, start_time, end_time, allowed_groups, allowed_genders, min_belt)
),
updated_templates AS (
  UPDATE public.class_templates existing
  SET
    allowed_groups = desired.allowed_groups,
    allowed_genders = desired.allowed_genders,
    min_belt = desired.min_belt,
    active = true
  FROM desired_templates desired
  WHERE existing.name = desired.name
    AND existing.weekday = desired.weekday
    AND existing.start_time = desired.start_time
    AND existing.end_time = desired.end_time
  RETURNING existing.id
),
inserted_templates AS (
  INSERT INTO public.class_templates
    (name, weekday, start_time, end_time, allowed_groups, allowed_genders, min_belt, active)
  SELECT
    desired.name,
    desired.weekday,
    desired.start_time,
    desired.end_time,
    desired.allowed_groups,
    desired.allowed_genders,
    desired.min_belt,
    true
  FROM desired_templates desired
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.class_templates existing
    WHERE existing.name = desired.name
      AND existing.weekday = desired.weekday
      AND existing.start_time = desired.start_time
      AND existing.end_time = desired.end_time
  )
  RETURNING id
)
UPDATE public.class_templates existing
SET active = false
WHERE NOT EXISTS (
  SELECT 1
  FROM desired_templates desired
  WHERE existing.name = desired.name
    AND existing.weekday = desired.weekday
    AND existing.start_time = desired.start_time
    AND existing.end_time = desired.end_time
);

COMMIT;
