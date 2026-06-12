-- Phase 11 — بوابة العملاء (Customer Portal)
-- نفّذي في Supabase → SQL Editor — on conflict do nothing

begin;

insert into public.nebras_data_store (store_key, payload) values
  ('customer_portal_users', '[]'::jsonb),
  ('customer_portal_audit', '[]'::jsonb)
on conflict (store_key) do nothing;

commit;

-- تحقق:
-- select store_key from public.nebras_data_store where store_key like 'customer_portal%';
