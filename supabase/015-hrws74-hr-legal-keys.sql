-- نبراس hrws74 — مفاتيح سحابية جديدة: سلف HR + عقود إيجار Legal
insert into public.nebras_data_store (store_key, payload) values
  ('hr_advances', '[]'::jsonb),
  ('legal_rentals', '[]'::jsonb),
  ('legal_notif_settings', '{"remindDays":[30,60],"lastScan":""}'::jsonb)
on conflict (store_key) do nothing;
