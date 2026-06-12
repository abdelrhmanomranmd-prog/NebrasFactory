-- ============================================================
-- نبراس hrws58 — تحقق سريع من السحابة (SQL Editor فقط)
-- نفّذي بعد 014-nebras-master-cloud-sync.sql
-- لا يغيّر بيانات — قراءة فقط
-- ============================================================

-- يجب أن يكون العدد 61
select count(*) as total_keys,
       case when count(*) >= 58 then 'OK — السحابة متزامنة' else 'ناقص — نفّذي 014' end as status
from public.nebras_data_store;

-- المفاتيح الحرجة لـ hrws58 (نقر + حوكمة + بوابة عملاء)
select store_key, jsonb_typeof(payload) as type, updated_at
from public.nebras_data_store
where store_key in (
  'system_settings', 'admin_users', 'dashboard_tiles',
  'customer_portal_users', 'customer_portal_audit', 'procurement_custom_depts',
  'hr_employees', 'hr_dept_activity', 'legal_contracts', 'crm_customers',
  'analytics_governance', 'admin_presence'
)
order by store_key;

-- قائمة كاملة
select store_key, jsonb_typeof(payload) as payload_type, updated_at
from public.nebras_data_store
order by store_key;
