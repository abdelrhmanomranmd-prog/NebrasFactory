-- ============================================================
-- منصة نبراس — تحقق بعد تنفيذ 001 و 002
-- Supabase → SQL Editor → Run
-- ============================================================

-- 1) جداول البيانات
select 'nebras_data_store' as item,
       count(*) as rows
from public.nebras_data_store;

select store_key,
       jsonb_typeof(payload) as payload_type,
       case
         when jsonb_typeof(payload) = 'array' then jsonb_array_length(payload)
         else null
       end as array_length,
       updated_at
from public.nebras_data_store
order by store_key;

-- 2) جدول عروض الأسعار
select 'nebras_sales_quotes' as item,
       count(*) as rows
from public.nebras_sales_quotes;

-- 3) bucket التخزين للصور
select id, name, public, file_size_limit
from storage.buckets
where id = 'nebras-media';

-- النتيجة المتوقعة:
-- nebras_data_store: 14 صف (مفاتيح فارغة في البداية)
-- nebras-media: صف واحد public = true
