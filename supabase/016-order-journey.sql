-- ============================================================
-- نبراس — مسار الطلب (Order Journey) — hrws60
-- نفّذي في: Supabase → SQL Editor → New query → Run
-- آمن للتكرار: ON CONFLICT DO NOTHING
-- ============================================================

begin;

insert into public.nebras_data_store (store_key, payload) values
  ('customer_order_journeys', '[]'::jsonb)
on conflict (store_key) do nothing;

commit;

select store_key, jsonb_typeof(payload) as payload_type, updated_at
from public.nebras_data_store
where store_key = 'customer_order_journeys';
