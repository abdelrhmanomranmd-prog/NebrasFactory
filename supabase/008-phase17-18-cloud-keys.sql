-- Phase 17–18 — مفاتيح سحابة إضافية (HR حوكمة · سجل عروض · تحليلات)
-- نفّذي في Supabase → SQL Editor إن لم تُنشأ المفاتيح تلقائياً من التطبيق

begin;

insert into public.nebras_data_store (store_key, payload) values
  ('showroom_gallery', '{}'::jsonb),
  ('sales_data', '[]'::jsonb),
  ('sales_quotes_inbox', '[]'::jsonb),
  ('analytics_governance', '{"deleted":{"quotes":[],"visitors":[],"complaints":[],"sales":[],"customers":[]}}'::jsonb),
  ('callback_leads', '[]'::jsonb),
  ('hr_employees', '[]'::jsonb),
  ('hr_vehicles', '[]'::jsonb),
  ('hr_leave', '[]'::jsonb),
  ('hr_vehicle_tracking', '[]'::jsonb),
  ('hr_attendance', '[]'::jsonb),
  ('hr_documents', '[]'::jsonb),
  ('hr_payroll', '[]'::jsonb),
  ('hr_notifications', '[]'::jsonb),
  ('hr_notif_settings', '{}'::jsonb),
  ('hr_email_queue', '[]'::jsonb),
  ('hr_shift_roster', '[]'::jsonb),
  ('hr_dept_activity', '[]'::jsonb),
  ('quote_registry', '{"byDate":{}}'::jsonb)
on conflict (store_key) do nothing;

commit;

-- تحقق:
-- select store_key from public.nebras_data_store order by store_key;
