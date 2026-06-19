-- نبراس — تحقق من الحفظ في السحابة (نفّذي بعد كل اختبار حفظ)
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
  'system_settings', 'visitor_icons', 'erp_orders'
)
order by updated_at desc;
