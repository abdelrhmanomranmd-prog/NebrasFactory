-- ============================================================
-- نبراس — سكربت سحابي موحّد (MASTER SYNC) — hrws102
-- نفّذي في: Supabase → SQL Editor → New query → Run
-- آمن للتكرار: ON CONFLICT DO NOTHING
-- يشمل: 68 مفتاح — المنصة + HR + Legal + CRM + ERP + نسخ احتياطية
-- للمشاريع القائمة: نفّذي أيضاً 023 إن كان العدد < 68
-- تحقق: supabase/024-verify-schema-complete.sql
-- ============================================================

begin;

-- ── المنصة الأساسية (001) ──
insert into public.nebras_data_store (store_key, payload) values
  ('site_products', '[]'::jsonb),
  ('visitor_icons', '[]'::jsonb),
  ('dashboard_tiles', '[]'::jsonb),
  ('site_custom_sections', '[]'::jsonb),
  ('about_pages', '{}'::jsonb),
  ('system_settings', '{}'::jsonb),
  ('admin_users', '[]'::jsonb),
  ('branches', '[]'::jsonb),
  ('complaints', '[]'::jsonb),
  ('audit_logs', '[]'::jsonb),
  ('erp_inventory', '[]'::jsonb),
  ('erp_orders', '[]'::jsonb),
  ('erp_procurement', '[]'::jsonb),
  ('erp_production', '[]'::jsonb),
  ('erp_purchases', '[]'::jsonb),
  ('erp_transfers', '[]'::jsonb),
  ('erp_stock_transfers', '[]'::jsonb),
  ('sales_price_list', '[]'::jsonb),
  ('site_partners', '[]'::jsonb),
  ('site_certifications', '[]'::jsonb),
  ('visitor_analytics', '{"sessions":[],"totalVisits":0,"totalPageViews":0}'::jsonb),
  ('customer_service', '[]'::jsonb)
on conflict (store_key) do nothing;

-- ── معرض + مفاتيح المرحلة 17-18 (008) ──
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
  ('admin_presence', '{}'::jsonb)
on conflict (store_key) do nothing;

-- ── Empire + Legal + CRM (009) ──
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
  ('admin_recovery_otp', '{}'::jsonb),
  ('hr_advances', '[]'::jsonb),
  ('legal_rentals', '[]'::jsonb),
  ('legal_notif_settings', '{"remindDays":[30,60],"lastScan":""}'::jsonb),
  ('hr_vehicle_violations', '[]'::jsonb)
on conflict (store_key) do nothing;

-- ── بوابة العملاء (011) ──
insert into public.nebras_data_store (store_key, payload) values
  ('customer_portal_users', '[]'::jsonb),
  ('customer_portal_audit', '[]'::jsonb)
on conflict (store_key) do nothing;

-- ── أقسام المشتريات (012 / 013) ──
insert into public.nebras_data_store (store_key, payload) values
  ('procurement_custom_depts', '[]'::jsonb)
on conflict (store_key) do nothing;

-- ── مسار الطلب (016 / hrws60) ──
insert into public.nebras_data_store (store_key, payload) values
  ('customer_order_journeys', '[]'::jsonb)
on conflict (store_key) do nothing;

-- ── نسخ احتياطية وحماية (017 / hrws63) ──
insert into public.nebras_data_store (store_key, payload) values
  ('nebras_cloud_snapshots', '{"byKey":{},"updatedAt":null}'::jsonb),
  ('nebras_platform_integrity', '{"modules":{},"lastAuditAt":null}'::jsonb)
on conflict (store_key) do nothing;

commit;

-- ============================================================
-- تحقق — عدد المفاتيح المتوقعة = 68
-- ============================================================
select count(*) as total_keys,
       case when count(*) >= 68 then 'OK — السحابة متزامنة'
            else 'ناقص — نفّذي 023-nebras-store-keys-complete.sql'
       end as status
from public.nebras_data_store;

select
  store_key,
  jsonb_typeof(payload) as payload_type,
  case
    when jsonb_typeof(payload) = 'array' then jsonb_array_length(payload)
    else null
  end as array_len,
  updated_at
from public.nebras_data_store
order by store_key;
