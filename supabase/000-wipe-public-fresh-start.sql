-- ============================================================
-- منصة نبراس — مسح قاعدة البيانات العامة للبداية من الصفر
-- آمن للدومين: لا يمس Vercel ولا Cloudflare ولا الموقع الحي
-- نفّذي مرة واحدة في SQL Editor ثم شغّلي 001-nebras-platform-v2.sql
-- ============================================================

begin;

-- إزالة الجداول القديمة + أي جداول public أخرى (تجربة سابقة)
drop table if exists public.content_blocks cascade;
drop table if exists public.site_sections cascade;
drop table if exists public.nebras_sales_quotes cascade;
drop table if exists public.nebras_data_store cascade;
drop table if exists public.albums cascade;
drop table if exists public.site_settings cascade;
drop table if exists public.platform_settings cascade;
drop table if exists public.about_pages cascade;
drop table if exists public.products cascade;
drop table if exists public.product_variants cascade;

-- دوال/سياسات قديمة (إن وُجدت من تجارب سابقة)
drop function if exists public.current_app_role() cascade;

commit;

-- بعد النجاح: نفّذي الملف 001-nebras-platform-v2.sql
