-- ============================================================
-- نبراس — تفعيل بوابة العملاء + أقسام المشتريات (سكربت واحد)
-- نفّذي في: Supabase → SQL Editor → Run
-- آمن للتكرار: on conflict do nothing
-- ============================================================

begin;

-- 1) بوابة العملاء (hrws50+)
insert into public.nebras_data_store (store_key, payload) values
  ('customer_portal_users', '[]'::jsonb),
  ('customer_portal_audit', '[]'::jsonb)
on conflict (store_key) do nothing;

-- 2) أقسام المشتريات المخصّصة (hrws52+)
insert into public.nebras_data_store (store_key, payload) values
  ('procurement_custom_depts', '[]'::jsonb)
on conflict (store_key) do nothing;

commit;

-- ============================================================
-- تحقق — يجب أن ترجع 3 صفوف
-- ============================================================
select
  store_key,
  jsonb_typeof(payload) as payload_type,
  updated_at
from public.nebras_data_store
where store_key in (
  'customer_portal_users',
  'customer_portal_audit',
  'procurement_custom_depts'
)
order by store_key;
