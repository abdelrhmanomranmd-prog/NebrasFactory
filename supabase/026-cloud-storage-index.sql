-- ============================================================
-- نبراس — فهرس أداء + تحقق التخزين (hrws152)
-- نفّذي في Supabase → SQL Editor → Run (آمن للتكرار)
-- ============================================================

begin;

create index if not exists nebras_data_store_key_updated_idx
  on public.nebras_data_store (store_key, updated_at desc);

comment on index public.nebras_data_store_key_updated_idx is
  'نبراس — استعلامات سريعة للتحقق من آخر تحديث لكل مخزن';

commit;

-- تحقق سريع بعد التنفيذ:
-- select store_key, updated_at, pg_column_size(payload) as bytes
-- from public.nebras_data_store
-- order by updated_at desc
-- limit 20;
