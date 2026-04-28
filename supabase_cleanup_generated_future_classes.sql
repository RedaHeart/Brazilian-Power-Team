-- ============================================================
-- Remove generated future classes so they can be regenerated from
-- the corrected class_templates. Manual classes are preserved.
-- ============================================================

DELETE FROM public.classes
WHERE template_id IS NOT NULL
  AND starts_at >= date_trunc('day', now());
