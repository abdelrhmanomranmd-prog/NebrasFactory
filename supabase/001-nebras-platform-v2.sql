-- ============================================================
-- منصة نبراس v2 — الهيكل الكامل (hrws102)
-- نفّذي مرة واحدة في: Supabase → SQL Editor → New query → Run
-- آمن للتكرار: CREATE IF NOT EXISTS + ON CONFLICT DO NOTHING
--
-- ترتيب التنفيذ على مشروع موجود:
--   1) هذا الملف (001) — جداول + كل المفاتيح
--   2) 002-storage-nebras-media.sql — bucket الصور
--   3) 019-grant-service-role.sql — صلاحيات API الآمن
--   4) 021-storage-enterprise.sql — 50MB للملفات
--   5) 018-rls-sensitive-keys.sql — بعد استقرار المنصة 7 أيام
--
-- عدد المفاتيح المتوقع = 68 (67 في التطبيق + admin_recovery_otp)
-- ============================================================

begin;

-- ── إزالة تجربة Supabase القديمة ──
drop table if exists public.content_blocks cascade;
drop table if exists public.site_sections cascade;

-- ── جدول المخازن السحابية ──
create table if not exists public.nebras_data_store (
  store_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.nebras_data_store is
  'منصة نبراس — منتجات، HR، Legal، CRM، ERP، إعدادات، نسخ احتياطية';

create index if not exists nebras_data_store_updated_idx
  on public.nebras_data_store (updated_at desc);

-- ── عروض الأسعار الواردة من الزوار ──
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

-- ── تحديث updated_at تلقائياً ──
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

-- ── RLS — المرحلة 1 (مفتوح — المرحلة 2 في 018) ──
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

-- ── صلاحيات Postgres ──
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.nebras_data_store to anon, authenticated, service_role;
grant select, insert, update, delete on table public.nebras_sales_quotes to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to service_role;

-- ════════════════════════════════════════════════════════════
-- مفاتيح البيانات — 68 مفتاحاً (متطابق مع التطبيق hrws102)
-- ════════════════════════════════════════════════════════════

-- [A] المنصة العامة والموقع
insert into public.nebras_data_store (store_key, payload) values
  ('site_products', '[]'::jsonb),
  ('visitor_icons', '[]'::jsonb),
  ('dashboard_tiles', '[]'::jsonb),
  ('site_custom_sections', '[]'::jsonb),
  ('about_pages', '{}'::jsonb),
  ('system_settings', '{}'::jsonb),
  ('branches', '[]'::jsonb),
  ('site_partners', '[]'::jsonb),
  ('site_certifications', '[]'::jsonb),
  ('showroom_gallery', '{}'::jsonb),
  ('visitor_analytics', '{"sessions":[],"totalVisits":0,"totalPageViews":0}'::jsonb)
on conflict (store_key) do nothing;

-- [B] الإدارة والحوكمة
insert into public.nebras_data_store (store_key, payload) values
  ('admin_users', '[]'::jsonb),
  ('admin_recovery_otp', '{}'::jsonb),
  ('admin_presence', '{}'::jsonb),
  ('audit_logs', '[]'::jsonb),
  ('analytics_governance', '{"deleted":{"quotes":[],"visitors":[],"complaints":[],"sales":[],"customers":[]}}'::jsonb),
  ('nebras_cloud_snapshots', '{"byKey":{},"updatedAt":null}'::jsonb),
  ('nebras_platform_integrity', '{"modules":{},"lastAuditAt":null}'::jsonb)
on conflict (store_key) do nothing;

-- [C] المبيعات وخدمة العملاء
insert into public.nebras_data_store (store_key, payload) values
  ('sales_data', '[]'::jsonb),
  ('sales_quotes_inbox', '[]'::jsonb),
  ('sales_price_list', '[]'::jsonb),
  ('quote_registry', '{"byDate":{}}'::jsonb),
  ('callback_leads', '[]'::jsonb),
  ('complaints', '[]'::jsonb),
  ('customer_service', '[]'::jsonb)
on conflict (store_key) do nothing;

-- [D] ERP والمشتريات
insert into public.nebras_data_store (store_key, payload) values
  ('erp_inventory', '[]'::jsonb),
  ('erp_orders', '[]'::jsonb),
  ('erp_procurement', '[]'::jsonb),
  ('erp_production', '[]'::jsonb),
  ('erp_purchases', '[]'::jsonb),
  ('erp_transfers', '[]'::jsonb),
  ('erp_stock_transfers', '[]'::jsonb),
  ('procurement_custom_depts', '[]'::jsonb)
on conflict (store_key) do nothing;

-- [E] بوابة العملاء ومسار الطلب
insert into public.nebras_data_store (store_key, payload) values
  ('customer_portal_users', '[]'::jsonb),
  ('customer_portal_audit', '[]'::jsonb),
  ('customer_order_journeys', '[]'::jsonb)
on conflict (store_key) do nothing;

-- [F] الموارد البشرية HR
insert into public.nebras_data_store (store_key, payload) values
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
  ('hr_companies', '[]'::jsonb),
  ('hr_gps_positions', '[]'::jsonb),
  ('hr_gps_settings', '{}'::jsonb),
  ('hr_gps_consents', '[]'::jsonb),
  ('hr_travel', '[]'::jsonb),
  ('hr_deductions', '[]'::jsonb),
  ('hr_advances', '[]'::jsonb),
  ('hr_vehicle_violations', '[]'::jsonb)
on conflict (store_key) do nothing;

-- [G] الشؤون القانونية Legal
insert into public.nebras_data_store (store_key, payload) values
  ('legal_contracts', '[]'::jsonb),
  ('legal_cases', '[]'::jsonb),
  ('legal_compliance', '[]'::jsonb),
  ('legal_policies', '[]'::jsonb),
  ('legal_correspondence', '[]'::jsonb),
  ('legal_activity', '[]'::jsonb),
  ('legal_rentals', '[]'::jsonb),
  ('legal_notif_settings', '{"remindDays":[30,60],"lastScan":""}'::jsonb)
on conflict (store_key) do nothing;

-- [H] إدارة علاقات العملاء CRM
insert into public.nebras_data_store (store_key, payload) values
  ('crm_customers', '[]'::jsonb),
  ('crm_opportunities', '[]'::jsonb),
  ('crm_activities', '[]'::jsonb),
  ('crm_audit', '[]'::jsonb)
on conflict (store_key) do nothing;

commit;

-- ════════════════════════════════════════════════════════════
-- تحقق بعد التنفيذ
-- ════════════════════════════════════════════════════════════
select count(*) as total_keys,
       case when count(*) >= 68 then 'OK — الهيكل كامل 68 مفتاح'
            else 'ناقص — راجعي السكربت أو نفّذي 023-nebras-store-keys-complete.sql'
       end as status
from public.nebras_data_store;

select store_key,
       jsonb_typeof(payload) as payload_type,
       case when jsonb_typeof(payload) = 'array' then jsonb_array_length(payload) else null end as array_len,
       updated_at
from public.nebras_data_store
order by store_key;
