-- ============================================================
-- 007 — إرسال اختياري: المبيعات / خدمة العملاء + صيغة الرسالة
-- لا يحتاج DDL — الحقول تُخزَّن داخل payload (jsonb):
--   messageFormat: 'a4-quote' | 'cart-order'
--   sentToChannel: 'sales' | 'customer-service'
--   quoteType: 'quote' | 'order'
-- نفّذي للتحقق فقط (اختياري):
-- ============================================================

-- تحقق من آخر الطلبات مع القناة والصيغة:
select
  quote_number,
  payload->>'messageFormat' as message_format,
  payload->>'sentToChannel' as sent_to_channel,
  payload->>'quoteType' as quote_type,
  status,
  created_at
from public.nebras_sales_quotes
order by created_at desc
limit 10;
