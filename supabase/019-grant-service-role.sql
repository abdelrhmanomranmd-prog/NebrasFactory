-- ============================================================
-- نبراس — صلاحيات service_role على nebras_data_store (hrws84)
-- نفّذي في Supabase → SQL Editor بعد تعيين SUPABASE_SERVICE_ROLE_KEY في Vercel
-- يحل: permission denied for table nebras_data_store عند رفع السحابة
-- ============================================================

begin;

-- جدول المخازن السحابية
grant select, insert, update, delete on table public.nebras_data_store to service_role;

-- جدول عروض المبيعات (إن وُجد)
grant select, insert, update, delete on table public.nebras_sales_quotes to service_role;

-- تسلسلات auto-increment (إن وُجدت)
grant usage, select on all sequences in schema public to service_role;

commit;

-- تحقق
select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'service_role'
  and table_name in ('nebras_data_store', 'nebras_sales_quotes')
group by grantee, table_name;

select count(*) as total_store_keys from public.nebras_data_store;
