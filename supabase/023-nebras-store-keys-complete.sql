-- ============================================================
-- نبراس hrws102 — مزامنة المفاتيح الناقصة (للمشاريع القائمة)
-- نفّذي إذا كان count(*) < 68 في nebras_data_store
-- آمن للتكرار: ON CONFLICT DO NOTHING — لا يمسح بيانات موجودة
-- ============================================================

begin;

-- مفاتيح كانت ناقصة في 001 القديم (22 مفتاح فقط) و 014 (64 مفتاح)
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
  ('quote_registry', '{"byDate":{}}'::jsonb),
  ('admin_presence', '{}'::jsonb),
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
  ('admin_recovery_otp', '{}'::jsonb),
  ('customer_portal_users', '[]'::jsonb),
  ('customer_portal_audit', '[]'::jsonb),
  ('procurement_custom_depts', '[]'::jsonb),
  ('customer_order_journeys', '[]'::jsonb),
  ('nebras_cloud_snapshots', '{"byKey":{},"updatedAt":null}'::jsonb),
  ('nebras_platform_integrity', '{"modules":{},"lastAuditAt":null}'::jsonb),
  ('hr_advances', '[]'::jsonb),
  ('legal_rentals', '[]'::jsonb),
  ('legal_notif_settings', '{"remindDays":[30,60],"lastScan":""}'::jsonb),
  ('hr_vehicle_violations', '[]'::jsonb)
on conflict (store_key) do nothing;

commit;

select count(*) as total_keys,
       case when count(*) >= 68 then 'OK — 68 مفتاح كامل'
            else 'لا يزال ناقصاً — راجعي القائمة أدناه'
       end as status
from public.nebras_data_store;

select store_key, jsonb_typeof(payload) as type, updated_at
from public.nebras_data_store
order by store_key;
