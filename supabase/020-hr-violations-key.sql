-- نبراس hrws85 — مفتاح سحابي: مخالفات مرور الأسطول
insert into public.nebras_data_store (store_key, payload) values
  ('hr_vehicle_violations', '[]'::jsonb)
on conflict (store_key) do nothing;
