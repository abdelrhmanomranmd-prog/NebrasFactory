-- ============================================================
-- نبراس — تفعيل Realtime على nebras_data_store (Shadow Mode)
-- نفّذي مرة واحدة: Supabase → SQL Editor → Run
-- آمن للتكرار
-- ============================================================

begin;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'nebras_data_store'
  ) then
    alter publication supabase_realtime add table public.nebras_data_store;
  end if;
exception
  when duplicate_object then null;
  when others then
    raise notice 'Realtime publication note: %', sqlerrm;
end $$;

commit;

-- تحقق:
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
