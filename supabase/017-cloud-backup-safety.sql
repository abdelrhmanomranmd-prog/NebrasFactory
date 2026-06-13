-- ============================================================
-- نبراس — حماية التخزين السحابي + نسخ احتياطية (hrws63)
-- نفّذي في Supabase → SQL Editor → Run
-- آمن للتكرار: ON CONFLICT DO NOTHING
-- ============================================================

begin;

-- نسخ احتياطية تلقائية قبل كل رفع — تمنع اختفاء البيانات عند الترقية
insert into public.nebras_data_store (store_key, payload) values
  ('nebras_cloud_snapshots', '{"byKey":{},"updatedAt":null}'::jsonb),
  ('nebras_platform_integrity', '{"modules":{},"lastAuditAt":null}'::jsonb)
on conflict (store_key) do nothing;

commit;

-- تحقق — العدد المتوقع بعد التنفيذ = 64 مفتاحاً (62 + 2 جديد)
select count(*) as total_keys from public.nebras_data_store;

select store_key, jsonb_typeof(payload) as type, updated_at
from public.nebras_data_store
where store_key in ('nebras_cloud_snapshots', 'nebras_platform_integrity', 'customer_order_journeys')
order by store_key;
