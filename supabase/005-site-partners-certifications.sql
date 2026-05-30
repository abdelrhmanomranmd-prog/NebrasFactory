-- ============================================================
-- منصة نبراس — شركاء + اعتمادات (تعديل 1)
-- نفّذي مرة واحدة إن لم تكن المفاتيح موجودة
-- ============================================================

insert into public.nebras_data_store (store_key, payload) values
  ('site_partners', '[]'::jsonb),
  ('site_certifications', '[]'::jsonb)
on conflict (store_key) do nothing;

grant select, insert, update, delete on table public.nebras_data_store to anon, authenticated;
