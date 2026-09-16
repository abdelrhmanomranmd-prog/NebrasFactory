-- Nebras governance hardening
-- Public visitors may read storefront content. All writes must use the signed
-- Vercel governance API with SUPABASE_SERVICE_ROLE_KEY.

begin;

drop policy if exists "nebras_store_public_insert" on public.nebras_data_store;
drop policy if exists "nebras_store_public_update" on public.nebras_data_store;
drop policy if exists "nebras_store_insert" on public.nebras_data_store;
drop policy if exists "nebras_store_update" on public.nebras_data_store;
drop policy if exists "nebras_store_delete" on public.nebras_data_store;

drop policy if exists "nebras_store_public_select" on public.nebras_data_store;
create policy "nebras_store_public_select" on public.nebras_data_store
  for select to anon, authenticated
  using (store_key in (
    'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
    'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
    'showroom_gallery', 'visitor_analytics'
  ));

commit;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'nebras_data_store'
order by policyname;
