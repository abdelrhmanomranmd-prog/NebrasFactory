-- Phase 9 — مفاتيح سحابة الإمبراطورية (Legal · CRM · GPS · شركات HR · سفر · خصومات)
-- نفّذي في Supabase → SQL Editor — on conflict do nothing (آمن للتكرار)
-- التطبيق يرفع البيانات ديناميكياً عند الحفظ من الإدارة

begin;

insert into public.nebras_data_store (store_key, payload) values
  ('hr_companies', '[]'::jsonb),
  ('hr_gps_positions', '[]'::jsonb),
  ('hr_gps_settings', '{}'::jsonb),
  ('hr_gps_consents', '[]'::jsonb),
  ('hr_travel', '[]'::jsonb),
  ('hr_deductions', '[]'::jsonb),
  ('legal_contracts', '[]'::jsonb),
  ('legal_cases', '[]'::jsonb),
  ('legal_compliance', '[]'::jsonb),
  ('legal_policies', '[]'::jsonb),
  ('legal_correspondence', '[]'::jsonb),
  ('legal_activity', '[]'::jsonb),
  ('crm_customers', '[]'::jsonb),
  ('crm_opportunities', '[]'::jsonb),
  ('crm_activities', '[]'::jsonb),
  ('crm_audit', '[]'::jsonb),
  ('admin_recovery_otp', '{}'::jsonb)
on conflict (store_key) do nothing;

commit;

-- تحقق:
-- select store_key from public.nebras_data_store order by store_key;
