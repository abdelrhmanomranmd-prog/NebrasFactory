-- ============================================================
-- منصة نبراس — تخزين الصور (رفع من الإدارة)
-- نفّذي في Supabase → SQL Editor → Run (مرة واحدة)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nebras-media',
  'nebras-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nebras media public read" on storage.objects;
drop policy if exists "nebras media public insert" on storage.objects;
drop policy if exists "nebras media public update" on storage.objects;
drop policy if exists "nebras media public delete" on storage.objects;

create policy "nebras media public read"
on storage.objects for select
using (bucket_id = 'nebras-media');

create policy "nebras media public insert"
on storage.objects for insert
with check (bucket_id = 'nebras-media');

create policy "nebras media public update"
on storage.objects for update
using (bucket_id = 'nebras-media');

create policy "nebras media public delete"
on storage.objects for delete
using (bucket_id = 'nebras-media');
