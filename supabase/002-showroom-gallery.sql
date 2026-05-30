-- معرض نبراس — مفتاح showroom_gallery في nebras_data_store
insert into public.nebras_data_store (store_key, payload) values
  ('showroom_gallery', '{"products":{"titleAr":"منتجات نبراس","items":[]},"projects":{"titleAr":"مشاريع نبراس","items":[]}}'::jsonb)
on conflict (store_key) do nothing;
