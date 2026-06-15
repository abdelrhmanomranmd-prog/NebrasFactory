-- نبراس hrws76 — توسيع سعة تخزين المرفقات (Supabase Storage)
update storage.buckets
set file_size_limit = 52428800
where id = 'nebras-media';

-- إن لم يُنفَّذ 002 بعد، شغّلي 002-storage-nebras-media.sql أولاً
