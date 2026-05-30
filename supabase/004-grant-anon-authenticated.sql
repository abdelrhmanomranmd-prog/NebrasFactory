-- ============================================================
-- منصة نبراس — صلاحيات الجداول لـ anon / authenticated
-- يحل خطأ 401 / permission denied في Console
-- Supabase → SQL Editor → Run (مرة واحدة)
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.nebras_data_store to anon, authenticated;
grant select, insert, update, delete on table public.nebras_sales_quotes to anon, authenticated;

-- تحقق سريع (اختياري):
-- select grantee, privilege_type, table_name
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'nebras_data_store';
