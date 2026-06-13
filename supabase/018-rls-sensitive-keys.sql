-- ============================================================
-- نبراس — RLS المرحلة 2: حماية المفاتيح الحساسة (hrws64)
-- ⚠️ نفّذي بعد نشر hrws64 على Vercel + تعيين SUPABASE_SERVICE_ROLE_KEY
-- الموقع العام يقرأ المفاتيح العامة فقط — البيانات الحساسة عبر API
-- ============================================================

begin;

-- إزالة السياسات المفتوحة
drop policy if exists "nebras_store_select" on public.nebras_data_store;
drop policy if exists "nebras_store_insert" on public.nebras_data_store;
drop policy if exists "nebras_store_update" on public.nebras_data_store;
drop policy if exists "nebras_store_delete" on public.nebras_data_store;

-- قراءة عامة: محتوى الموقع والمعرض فقط
create policy "nebras_store_public_select" on public.nebras_data_store
  for select to anon, authenticated
  using (store_key in (
    'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
    'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
    'showroom_gallery', 'visitor_analytics'
  ));

-- كتابة عامة: نفس المفاتيح (الإدارة عبر جلسة API للحساسة)
create policy "nebras_store_public_insert" on public.nebras_data_store
  for insert to anon, authenticated
  with check (store_key in (
    'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
    'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
    'showroom_gallery', 'visitor_analytics'
  ));

create policy "nebras_store_public_update" on public.nebras_data_store
  for update to anon, authenticated
  using (store_key in (
    'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
    'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
    'showroom_gallery', 'visitor_analytics'
  ))
  with check (store_key in (
    'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
    'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
    'showroom_gallery', 'visitor_analytics'
  ));

-- service_role يتجاوز RLS تلقائياً — API الآمن يستخدمه للمفاتيح الحساسة

commit;

select 'RLS phase 2 applied — sensitive keys protected from anon' as status;

-- تحقق: سياسات nebras_data_store
select policyname, cmd, roles from pg_policies
where tablename = 'nebras_data_store' order by policyname;
