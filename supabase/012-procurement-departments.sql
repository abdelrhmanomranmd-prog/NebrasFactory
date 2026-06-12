-- نبراس — أقسام المشتريات المخصّصة (ديناميكي من الإدارة الرئيسية)
insert into public.nebras_data_store (store_key, payload) values
  ('procurement_custom_depts', '[]'::jsonb)
on conflict (store_key) do nothing;
