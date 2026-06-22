-- ============================================================
-- نبراس hrws102 — تحقق 100% من اكتمال الهيكل
-- قراءة فقط — لا يغيّر أي بيانات
-- ============================================================

-- 1) العدد الإجمالي
select count(*) as total_keys,
       case when count(*) >= 68 then '✓ OK'
            else '✗ ناقص — نفّذي 023-nebras-store-keys-complete.sql'
       end as keys_status
from public.nebras_data_store;

-- 2) المفاتيح الإلزامية (68) — أي MISSING = مشكلة
with required(key) as (values
  ('about_pages'), ('admin_presence'), ('admin_recovery_otp'), ('admin_users'),
  ('analytics_governance'), ('audit_logs'), ('branches'), ('callback_leads'),
  ('complaints'), ('crm_activities'), ('crm_audit'), ('crm_customers'),
  ('crm_opportunities'), ('customer_order_journeys'), ('customer_portal_audit'),
  ('customer_portal_users'), ('customer_service'), ('dashboard_tiles'),
  ('erp_inventory'), ('erp_orders'), ('erp_procurement'), ('erp_production'),
  ('erp_purchases'), ('erp_stock_transfers'), ('erp_transfers'),
  ('hr_advances'), ('hr_attendance'), ('hr_companies'), ('hr_deductions'),
  ('hr_dept_activity'), ('hr_documents'), ('hr_email_queue'), ('hr_employees'),
  ('hr_gps_consents'), ('hr_gps_positions'), ('hr_gps_settings'), ('hr_leave'),
  ('hr_notif_settings'), ('hr_notifications'), ('hr_payroll'), ('hr_shift_roster'),
  ('hr_travel'), ('hr_vehicle_tracking'), ('hr_vehicle_violations'), ('hr_vehicles'),
  ('legal_activity'), ('legal_cases'), ('legal_compliance'), ('legal_contracts'),
  ('legal_correspondence'), ('legal_notif_settings'), ('legal_policies'), ('legal_rentals'),
  ('nebras_cloud_snapshots'), ('nebras_platform_integrity'), ('procurement_custom_depts'),
  ('quote_registry'), ('sales_data'), ('sales_price_list'), ('sales_quotes_inbox'),
  ('showroom_gallery'), ('site_certifications'), ('site_custom_sections'),
  ('site_partners'), ('site_products'), ('system_settings'), ('visitor_analytics'),
  ('visitor_icons')
)
select r.key as missing_key
from required r
left join public.nebras_data_store d on d.store_key = r.key
where d.store_key is null
order by r.key;

-- 3) المفاتيح الحرجة — هل فيها بيانات؟
select store_key,
       updated_at,
       case
         when jsonb_typeof(payload) = 'array' then jsonb_array_length(payload)
         when jsonb_typeof(payload) = 'object' then (select count(*) from jsonb_object_keys(payload) k)
         else 0
       end as record_count
from public.nebras_data_store
where store_key in (
  'admin_users', 'site_products', 'hr_employees', 'legal_contracts',
  'system_settings', 'erp_orders', 'crm_customers', 'customer_order_journeys'
)
order by updated_at desc;

-- 4) صلاحيات service_role (للـ API الآمن)
select grantee, table_name,
       string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'service_role'
  and table_name in ('nebras_data_store', 'nebras_sales_quotes')
group by grantee, table_name;

-- 5) bucket التخزين
select id, name, public, file_size_limit
from storage.buckets
where id = 'nebras-media';
