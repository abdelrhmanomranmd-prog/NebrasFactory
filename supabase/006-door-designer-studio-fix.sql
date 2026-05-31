-- ============================================================
-- إصلاح إعدادات مصمم الأبواب في السحاب — studio + معاينة مفعّلة
-- نفّذي في Supabase → SQL Editor بعد رفع GitHub
-- ============================================================

begin;

update public.nebras_data_store
set payload = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(payload, '{}'::jsonb),
        '{doorDesigner}',
        coalesce(payload->'doorDesigner', '{}'::jsonb),
        true
      ),
      '{doorDesigner,enabled}',
      'true'::jsonb,
      true
    ),
    '{doorDesigner,previewModelEnabled}',
    'true'::jsonb,
    true
  ),
  '{doorDesigner,designCanvasMode}',
  '"studio"'::jsonb,
  true
)
where store_key = 'system_settings';

-- تأكيد: 20 رولّة ألوان + وضع الاستوديو
update public.nebras_data_store
set payload = jsonb_set(
  jsonb_set(
    jsonb_set(
      payload,
      '{doorDesigner,useCompositorPreview}',
      'false'::jsonb,
      true
    ),
    '{doorDesigner,use3dPreview}',
    'false'::jsonb,
    true
  ),
  '{doorDesigner,usePhotorealPreview}',
  'false'::jsonb,
  true
)
where store_key = 'system_settings';

commit;

-- تحقق سريع:
-- select payload->'doorDesigner'->>'designCanvasMode' as mode,
--        payload->'doorDesigner'->>'previewModelEnabled' as preview
-- from public.nebras_data_store where store_key = 'system_settings';
