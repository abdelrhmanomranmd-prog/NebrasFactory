-- ============================================================
-- منصة نبراس v2 — جداول جديدة للمنصة الحالية (2025)
-- لا تعتمد على content_blocks / site_sections القديمة
-- نفّذي مرة واحدة في: Supabase → SQL Editor → New query → Run
-- ============================================================

begin;

-- إزالة تجربة Supabase القديمة (جزئية — قبل المنصة الكاملة)
drop table if exists public.content_blocks cascade;
drop table if exists public.site_sections cascade;

-- مخزن رئيسي: كل وحدة في المنصة = مفتاح + JSON (مثل localStorage لكن سحابي)
create table if not exists public.nebras_data_store (
  store_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.nebras_data_store is
  'منصة نبراس — منتجات، أيقونات، داشبورد، إعدادات، ERP، من نحن …';

-- عروض الأسعار الواردة من الزوار
create table if not exists public.nebras_sales_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewed', 'sent', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nebras_sales_quotes_created_idx
  on public.nebras_sales_quotes (created_at desc);

create index if not exists nebras_sales_quotes_status_idx
  on public.nebras_sales_quotes (status);

-- تحديث updated_at تلقائياً
create or replace function public.nebras_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists nebras_data_store_updated_at on public.nebras_data_store;
create trigger nebras_data_store_updated_at
  before update on public.nebras_data_store
  for each row execute function public.nebras_touch_updated_at();

drop trigger if exists nebras_sales_quotes_updated_at on public.nebras_sales_quotes;
create trigger nebras_sales_quotes_updated_at
  before update on public.nebras_sales_quotes
  for each row execute function public.nebras_touch_updated_at();

-- RLS — المرحلة 1: الموقع يكتب من المتصفح (anon)
-- المرحلة 2 لاحقاً: تقييد الكتابة بـ Supabase Auth
alter table public.nebras_data_store enable row level security;
alter table public.nebras_sales_quotes enable row level security;

drop policy if exists "nebras_store_select" on public.nebras_data_store;
drop policy if exists "nebras_store_insert" on public.nebras_data_store;
drop policy if exists "nebras_store_update" on public.nebras_data_store;
drop policy if exists "nebras_store_delete" on public.nebras_data_store;

create policy "nebras_store_select" on public.nebras_data_store for select using (true);
create policy "nebras_store_insert" on public.nebras_data_store for insert with check (true);
create policy "nebras_store_update" on public.nebras_data_store for update using (true) with check (true);
create policy "nebras_store_delete" on public.nebras_data_store for delete using (true);

drop policy if exists "nebras_quotes_select" on public.nebras_sales_quotes;
drop policy if exists "nebras_quotes_insert" on public.nebras_sales_quotes;
drop policy if exists "nebras_quotes_update" on public.nebras_sales_quotes;

create policy "nebras_quotes_select" on public.nebras_sales_quotes for select using (true);
create policy "nebras_quotes_insert" on public.nebras_sales_quotes for insert with check (true);
create policy "nebras_quotes_update" on public.nebras_sales_quotes for update using (true) with check (true);

-- صلاحيات Postgres (بدونها يظهر 401 / permission denied في المتصفح)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.nebras_data_store to anon, authenticated;
grant select, insert, update, delete on table public.nebras_sales_quotes to anon, authenticated;

-- مفاتيح البيانات (فارغة — التطبيق يملؤها عند الحفظ من الإدارة)
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
  ('visitor_analytics', '{"sessions":[],"totalVisits":0,"totalPageViews":0}'::jsonb)
on conflict (store_key) do nothing;

commit;

-- تحقق سريع بعد التنفيذ:
-- select store_key, jsonb_typeof(payload), updated_at from public.nebras_data_store order by store_key;
